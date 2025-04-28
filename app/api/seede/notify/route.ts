import { multipostDb } from '@/lib/db';
import { updatePosterGeneration } from '@/app/dashboard/poster/action';
import { z } from 'zod';
import { errorResponse, successResponse } from '@/lib/response';

// 定义 Webhook 通知数据结构验证
const SeedeWebhookSchema = z.object({
  task_id: z.string(),
  project_id: z.string(),
});

export async function POST(request: Request) {
  try {
    // 解析并验证请求体
    const payload = await request.json();
    const validatedData = SeedeWebhookSchema.parse(payload);

    const { task_id } = validatedData;

    // 查找对应的海报生成任务
    const posterTask = await multipostDb.posterGeneration.findFirst({
      where: { taskId: task_id },
    });

    if (!posterTask) {
      throw new Error('Task not found');
    }

    const result = await updatePosterGeneration(posterTask.id);
    if (!result.success) {
      throw new Error(result.error);
    }

    return successResponse({});
  } catch (error) {
    console.error('处理Seede Webhook失败:', error);
    return errorResponse(error);
  }
}
