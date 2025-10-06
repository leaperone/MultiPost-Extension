import { multipostDb } from '@/lib/db';
import { errorResponse, successResponse } from '@/lib/response';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { PromotionTaskTypeLabelMap } from '../types';

const openai = createOpenAI({
  apiKey: '',
  baseURL: 'https://api.2some.one/v1',
});

// 允许流式响应最多持续30秒
export const maxDuration = 30;

const sys_prompt = `
我会提供一个推广任务的内容给你，请你根据任务内容生成一个推广帖子。

推广贴子是一个推特帖子，内容需要包含任务的推广码以及一个或多个关键词

140字以内；输出中文；

请根据以上指导生成一个推广帖子：`;

export async function POST(req: Request) {
  const { taskId, code }: { taskId: string; code: string } = await req.json();

  const task = await multipostDb.promotionTask.findUnique({
    where: {
      id: taskId,
    },
  });

  if (!task) {
    return errorResponse('任务不存在');
  }

  const { text } = await generateText({
    model: openai(process.env.DEEPSEEK_MODEL || 'deepseek-chat', {}),
    system: sys_prompt,
    prompt: `任务描述：${task.description} 推广码：${code} 关键词：${task.keywords} 参考文案：${task.examples} 任务类型：${PromotionTaskTypeLabelMap[task.taskType as keyof typeof PromotionTaskTypeLabelMap]}`,
  });

  return successResponse(text);
}
