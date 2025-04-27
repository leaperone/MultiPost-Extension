import { NextResponse } from 'next/server';
import { multipostDb } from '@/lib/db';
import { deductCredit } from '@/actions/credit';
import { PRICING } from '@/actions/credit/types';
import { z } from 'zod';
import { PosterGenerationStatus } from '@/app/dashboard/poster/types';

// 定义 Webhook 通知数据结构验证
const SeedeWebhookSchema = z.object({
  task_id: z.string(),
  project_id: z.string(),
  owner_id: z.string(),
  status: z.enum(['processing', 'completed', 'failed']),
  step: z.enum(['generation', 'rendering', 'completed']),
  updated_at: z.string(),
  urls: z.object({
    task: z.string().url(),
    image: z.string().url(),
    project: z.string().url(),
  }),
});

export async function POST(request: Request) {
  try {
    // 解析并验证请求体
    const payload = await request.json();
    const validatedData = SeedeWebhookSchema.safeParse(payload);

    if (!validatedData.success) {
      console.error('无效的Webhook数据:', validatedData.error);
      return NextResponse.json({ success: false, error: 'Invalid webhook data' }, { status: 400 });
    }

    const { task_id, status, urls } = validatedData.data;

    // 查找对应的海报生成任务
    const posterTask = await multipostDb.posterGeneration.findFirst({
      where: { taskId: task_id },
    });

    if (!posterTask) {
      console.error('找不到对应的海报生成任务:', task_id);
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    // 根据状态更新数据库记录
    const updateData: {
      status: string;
      urls: typeof urls;
      lastImageUrl?: string;
      error?: string;
      projectId: string;
      taskId: string;
      ownerId: string;
    } = {
      status,
      urls: validatedData.data.urls,
      projectId: validatedData.data.project_id,
      taskId: validatedData.data.task_id,
      ownerId: validatedData.data.owner_id,
    };

    // 如果是完成状态，添加最后的图片URL
    if (status === 'completed') {
      updateData.lastImageUrl = urls.image;
      updateData.status = PosterGenerationStatus.DONE;

      // 扣除用户积分
      try {
        await deductCredit({
          userId: posterTask.userId,
          type: 'IMAGE_GENERATION', // 使用现有的图像生成类型
          amount: PRICING.POSTER_GENERATION,
        });
      } catch (error) {
        console.error('扣除积分失败:', error);
        // 继续处理，不中断流程
      }
    }

    // 如果是失败状态，记录错误信息
    else if (status === 'failed') {
      updateData.error = 'Poster generation failed';
      updateData.status = PosterGenerationStatus.FAILED;
    }

    // 更新数据库
    await multipostDb.posterGeneration.update({
      where: { id: posterTask.id },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('处理Seede Webhook失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
