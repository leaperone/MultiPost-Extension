import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient as PrismaMultipostClient } from '../prisma/client_multipost';
import { OpenAI } from 'openai';
import { config } from 'dotenv';
import { resolve } from 'path';
import { ImageGenerationStatus } from '@/app/dashboard/images/types';
import { deductCreditWorker } from '@/actions/credit/worker';
import { PRICING } from '@/actions/credit/types';

// 加载环境变量
config({
  path: resolve(process.cwd(), '.env.local'),
});

interface ImageGenerationBody {
  id: string;
}

// 创建客户端单例
const createMultipostClient = () => new PrismaMultipostClient();

// 初始化客户端实例
const multipostDb = createMultipostClient();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_API_URL,
});

const app = Fastify();

// 处理图片生成的后台任务
async function processImageGenerationByChat(id: string, retry: boolean = false) {
  try {
    console.log(`开始处理图片生成任务 ${id}`);

    // 获取任务信息
    const task = await multipostDb.imageGeneration.findUnique({
      where: { id },
    });

    if (!task) {
      console.error(`任务 ${id} 不存在`);
      throw new Error('任务不存在');
    }

    // 更新任务状态为处理中
    await multipostDb.imageGeneration.update({
      where: { id },
      data: { status: ImageGenerationStatus.PROCESSING },
    });

    if (!task.prompt) {
      console.error(`任务 ${id} 缺少 prompt 参数`);
      throw new Error('缺少必要的 prompt 参数');
    }

    if (task.size !== '1024x1024' && task.size !== '1536x1024' && task.size !== '1024x1536' && task.size !== 'auto') {
      console.error(`任务 ${id} size 参数不正确: ${task.size}`);
      throw new Error('size 参数不正确');
    }

    let prompt = task.prompt;

    if (task.size) {
      prompt = `size: ${task.size}\n${prompt}`;
    }

    if (task.extraPrompt) {
      prompt = `${task.extraPrompt}\n${prompt}`;
    }

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    interface ImageData {
      url: string;
    }

    if (task.images && Array.isArray(task.images)) {
      const images = [];
      for (const image of task.images) {
        const imageData = image as unknown as ImageData;
        if (imageData?.url && typeof imageData.url === 'string') {
          images.push({
            type: 'image_url' as const,
            image_url: {
              url: imageData.url,
            },
          });
        }
      }

      messages.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt,
          },
          ...images,
        ],
      });
    } else {
      messages.push({
        role: 'user',
        content: prompt,
      });
    }

    // 调用 API 生成图片，使用流式传输
    const stream = await openai.chat.completions.create({
      model: retry ? 'gpt-4o-image-vip' : 'gpt-4o-image',
      messages,
      stream: true,
    });

    let accumulatedContent = '';
    let lastUpdateTime = Date.now();

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      accumulatedContent += content;

      // 每10秒更新一次数据库中的response
      const currentTime = Date.now();
      if (currentTime - lastUpdateTime >= 10000) {
        await multipostDb.imageGeneration.update({
          where: { id },
          data: {
            response: JSON.parse(
              JSON.stringify({
                timestamp: new Date().toISOString(),
                content: accumulatedContent,
              }),
            ),
          },
        });
        lastUpdateTime = currentTime;
      }
    }

    if (!accumulatedContent) {
      console.error(`任务 ${id} 生成内容为空`);
      throw new Error('生成内容失败');
    }

    // 解析生成的内容
    const urlMatch = accumulatedContent.match(/\[100\]\((.*?)\)/);
    const imageUrlMatch = accumulatedContent.match(/!\[.*?\]\((.*?)\)/);

    if (!urlMatch && !imageUrlMatch) {
      console.error(`任务 ${id} 无法解析图片 URL，内容:`, accumulatedContent);
      throw new Error(accumulatedContent);
    }

    // 优先使用图片标签中的URL，如果没有则使用进度链接中的URL
    const imageUrl = imageUrlMatch ? imageUrlMatch[1] : urlMatch![1];

    // 尝试从 JSON 代码块中提取 prompt
    let revisedPrompt = task.prompt;
    const jsonMatch = accumulatedContent.match(/```json\s*({[\s\S]*?})\s*```/);

    if (jsonMatch) {
      try {
        const jsonData = JSON.parse(jsonMatch[1]);
        if (jsonData.prompt) {
          revisedPrompt = jsonData.prompt;
        }
      } catch (error) {
        console.warn(`任务 ${id} 解析 JSON prompt 失败:`, error);
        // 解析失败时保持使用原始 prompt
      }
    }

    // 格式化结果为所需的格式
    const formattedResult = [
      {
        url: imageUrl,
        revised_prompt: revisedPrompt,
      },
    ];

    // 更新任务状态为完成
    await multipostDb.$transaction(async (tx) => {
      await tx.imageGeneration.update({
        where: { id },
        data: {
          status: ImageGenerationStatus.DONE,
          result: formattedResult,
          response: JSON.parse(
            JSON.stringify({
              timestamp: new Date().toISOString(),
              content: accumulatedContent,
            }),
          ),
        },
      });

      await deductCreditWorker(task.userId, 'IMAGE_GENERATION', PRICING.IMAGE_GENERATION.mul(task.number));
    });

    console.log(`图片生成任务 ${id} 已完成`);
  } catch (error) {
    console.error(`处理图片生成任务 ${id} 时出错:`, error);

    let content = error instanceof Error ? error.message : '未知错误';

    if (content.includes('429')) {
      content = 'Request limit exceeded';
    }

    if (content.includes('vip') || content.includes('渠道') || content.includes('VIP')) {
      content = 'Internal server error, please try again later';
    }

    if (!retry) {
      processImageGenerationByChat(id, true).catch((error) => {
        console.error('后台任务处理失败:', error);
      });
      return;
    }

    // 更新任务状态为失败
    await multipostDb.imageGeneration.update({
      where: { id },
      data: {
        status: ImageGenerationStatus.FAILED,
        response: JSON.parse(
          JSON.stringify({
            content,
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error',
          }),
        ),
      },
    });
  }
}

// 处理 POST /api/image-generation-chat 请求
app.post(
  '/api/image-generation-chat',
  async (req: FastifyRequest<{ Body: ImageGenerationBody }>, reply: FastifyReply) => {
    try {
      console.log('处理图片生成任务(Chat)', req.body);
      const { id } = req.body;

      if (!id) {
        return reply.code(400).send({
          error: '缺少必要的 id 参数',
        });
      }

      const imageGeneration = await multipostDb.imageGeneration.findFirst({
        where: {
          id,
        },
      });

      if (!imageGeneration) {
        return reply.code(404).send({
          error: '未找到对应的图片生成任务',
        });
      }

      if (imageGeneration.status !== ImageGenerationStatus.PENDING) {
        return reply.code(400).send({
          error: '图片生成任务状态不正确',
        });
      }

      // 启动后台处理任务
      processImageGenerationByChat(id).catch((error) => {
        console.error('后台任务处理失败:', error);
      });

      return reply.send({
        message: '图片生成任务已开始处理',
        timestamp: new Date().toISOString(),
        taskId: id,
      });
    } catch (error) {
      console.error('处理请求时发生错误:', error);
      return reply.code(400).send({
        error: '无效的请求数据',
        details: error instanceof Error ? error.message : '未知错误',
      });
    }
  },
);

const PORT = 8080;

const start = async () => {
  try {
    await app.listen({ port: PORT });
    console.log(`服务器正在监听端口 ${PORT}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();

// 优雅关闭服务器
process.on('SIGTERM', async () => {
  console.log('收到 SIGTERM 信号，正在关闭服务器...');
  await app.close();
  console.log('服务器已关闭');
  process.exit(0);
});
