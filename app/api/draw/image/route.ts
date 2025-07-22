import { createOpenAI } from '@ai-sdk/openai';
import { streamText, CoreUserMessage } from 'ai';
import { ImageGenerationStatus } from './types';
import { auth } from '@/auth';
import { deductCredit, preCheckCredit } from '@/actions/credit';
import { PRICING } from '@/actions/credit/types';
import { multipostDb } from '@/lib/db';
import ky from 'ky';

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY!, baseURL: process.env.OPENAI_BASE_URL! });

interface FileCreateResponse {
  code: number;
  data: {
    fileId: string;
    url: string;
  };
  msg: string;
}

interface FilePreviewResponse {
  code: number;
  data: {
    previewUrl: string;
  };
  msg: string;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !session.user.id) {
      throw new Error('Unauthorized');
    }
    const userId = session.user.id;

    const body = await req.json();
    const { id } = body;
    if (!id) {
      return new Response(JSON.stringify({ error: 'id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const task = await multipostDb.imageGeneration.findUnique({
      where: { id, userId },
    });

    if (!task) {
      return new Response(JSON.stringify({ error: 'Task not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!(await preCheckCredit(session.user.id, PRICING.IMAGE_GENERATION.mul(task.number).toNumber()))) {
      throw new Error('Insufficient credits');
    }

    const prompt = `${task.extraPrompt}\n\n${task.prompt}`;

    // 构造消息
    const messages: CoreUserMessage[] = [];
    if (Array.isArray(task.images)) {
      const images = (task.images as string[]).filter((url) => typeof url === 'string');
      if (images.length > 0) {
        messages.push({
          role: 'user',
          content: [{ type: 'text', text: prompt }, ...images.map((url) => ({ type: 'image' as const, image: url }))],
        });
      } else {
        messages.push({ role: 'user', content: prompt });
      }
    } else {
      messages.push({ role: 'user', content: prompt });
    }

    // 用 Vercel AI SDK streamText 流式生成，onFinish/onError 处理后续逻辑
    const result = await streamText({
      model: openai('gpt-4o-image', {}),
      messages,
      onFinish: async ({ text }) => {
        // 提取图片 URL
        const urlMatch = text.match(/\[100\]\((.*?)\)/);
        const imageUrlMatch = text.match(/!\[.*?\]\((.*?)\)/);
        const imageUrl = imageUrlMatch ? imageUrlMatch[1] : urlMatch?.[1];
        if (imageUrl) {
          const result = await deductCredit({
            userId,
            type: 'IMAGE_GENERATION',
            amount: PRICING.IMAGE_GENERATION.mul(task.number),
          });
          if (!result.success) {
            throw new Error(result.error);
          }
          let fileId: string | undefined;

          try {
            // Create a file record in our system and get a presigned URL for upload
            const fsCreateUrlResp = await ky.post(`${process.env.APP_URL}/api/v1/file/create`, {
              headers: {
                Authorization: `Bearer ${process.env.INTERNAL_SECRET!}`,
                'X-User-Id': userId,
                'X-Source': 'IMAGE_GENERATION',
              },
              body: JSON.stringify({
                filename: `image-${task.id}.png`,
              }),
            });

            const fsCreateUrlData = (await fsCreateUrlResp.json()) as FileCreateResponse;
            if (fsCreateUrlData.code !== 0) {
              throw new Error(`Failed to create file upload URL: ${fsCreateUrlData.msg}`);
            }

            fileId = fsCreateUrlData.data.fileId;
            const uploadUrl = fsCreateUrlData.data.url;

            // Download the generated image
            const imageBlob = await ky.get(imageUrl).blob();

            // Upload the image to our file hosting via the presigned URL
            await ky.put(uploadUrl, {
              body: imageBlob,
              headers: {
                'Content-Type': 'image/png',
              },
            });

            // Get the permanent preview URL for the uploaded file
            const fsPreviewUrlResp = await ky.get(`${process.env.APP_URL}/api/v1/file/${fileId}/preview`);
            const fsPreviewUrlData = (await fsPreviewUrlResp.json()) as FilePreviewResponse;
            if (fsPreviewUrlData.code !== 0) {
              console.warn(`Failed to get preview URL for ${fileId}, using original url`);
            }
          } catch (uploadError) {
            console.error('Failed to upload image to file hosting, fallback to original url', uploadError);
            // Fallback to original image URL if upload fails, do nothing
          }
          await multipostDb.imageGeneration.update({
            where: { id: task.id },
            data: {
              status: ImageGenerationStatus.DONE,
              result: [{ url: imageUrl, revised_prompt: prompt }],
              response: JSON.parse(
                JSON.stringify({
                  timestamp: new Date().toISOString(),
                  content: text,
                }),
              ),
              fileHostingId: fileId,
            },
          });
        } else {
          await multipostDb.imageGeneration.update({
            where: { id: task.id },
            data: {
              status: ImageGenerationStatus.FAILED,
              response: JSON.parse(
                JSON.stringify({
                  content: text,
                  timestamp: new Date().toISOString(),
                  error: '生成内容失败',
                }),
              ),
            },
          });
        }
      },
      // 流式出错时自动处理
      onError: async (error) => {
        await multipostDb.imageGeneration.update({
          where: { id: task.id },
          data: {
            status: ImageGenerationStatus.FAILED,
            response: JSON.parse(
              JSON.stringify({
                content: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString(),
                error: error instanceof Error ? error.message : '未知错误',
              }),
            ),
          },
        });
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : '未知错误' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
