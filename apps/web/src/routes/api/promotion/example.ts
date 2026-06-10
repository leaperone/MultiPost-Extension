import { createOpenAI } from '@ai-sdk/openai';
import { createFileRoute } from '@tanstack/react-router';
import { PromotionTask } from '@db/schema/schema';
import { generateText } from 'ai';
import { eq } from 'drizzle-orm';

import { db } from '../../../lib/db';
import { errorResponse, successResponse, unauthenticatedResponse } from '../../../lib/response';
import { PromotionTaskTypeLabelMap } from './-types';

const openai = createOpenAI({
  apiKey: process.env.LEAPERONE_API_KEY,
  baseURL: process.env.LEAPERONE_API_BASE_URL,
});

const sysPrompt = `
我会提供一个推广任务的内容给你，请你根据任务内容生成一个推广帖子。

推广贴子是一个推特帖子，内容需要包含任务的推广码以及一个或多个关键词

140字以内；输出中文；

请根据以上指导生成一个推广帖子：`;

export const Route = createFileRoute('/api/promotion/example')({
  server: {
    handlers: {
      POST,
    },
  },
});

async function POST({ request }: { request: Request }) {
  const { getSessionFromRequest } = await import('../../../lib/session');
  const session = await getSessionFromRequest(request);
  if (!session?.user?.id) {
    return unauthenticatedResponse();
  }

  try {
    const { taskId, code }: { taskId: string; code: string } = await request.json();

    const [task] = await db.select().from(PromotionTask).where(eq(PromotionTask.id, taskId)).limit(1);

    if (!task) {
      return errorResponse('任务不存在');
    }

    const { text } = await generateText({
      model: openai(process.env.DEEPSEEK_MODEL || 'deepseek-chat', {}),
      system: sysPrompt,
      prompt: `任务描述：${task.description} 推广码：${code} 关键词：${task.keywords} 参考文案：${task.examples} 任务类型：${PromotionTaskTypeLabelMap[task.taskType as keyof typeof PromotionTaskTypeLabelMap]}`,
    });

    return successResponse(text);
  } catch (error) {
    return errorResponse(error);
  }
}
