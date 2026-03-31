import { multipostDb } from '@/lib/db';
import { z } from 'zod';
import { errorResponse, successResponse } from '@/lib/response';
import { PosterGenerationStatus } from '@/actions/draw/poster/types';
import { deductCredit } from '@/actions/credit';
import { PRICING } from '@/actions/credit/types';

// 完整的 Seede Webhook payload 验证
const SeedeWebhookSchema = z.object({
  task_id: z.string(),
  project_id: z.string(),
  owner_id: z.string().optional(),
  status: z.enum(['processing', 'completed', 'failed']),
  step: z.enum(['generation', 'rendering', 'completed']).optional(),
  updated_at: z.string().optional(),
  urls: z
    .object({
      task: z.string().optional(),
      image: z.string().optional(),
      project: z.string().optional(),
    })
    .optional(),
  error: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const secret = url.searchParams.get('secret');
    if (!secret || secret !== process.env.SEEDE_WEBHOOK_SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }

    const payload = await request.json();
    const validatedData = SeedeWebhookSchema.parse(payload);

    const { task_id, status, step, urls, project_id } = validatedData;

    // 查找对应的海报生成任务
    const posterTask = await multipostDb.posterGeneration.findFirst({
      where: { taskId: task_id },
    });

    if (!posterTask) {
      throw new Error('Task not found');
    }

    // 已完成或已失败的任务不再更新
    if (
      posterTask.status === PosterGenerationStatus.COMPLETED ||
      posterTask.status === PosterGenerationStatus.FAILED
    ) {
      return successResponse({});
    }

    // 构建 urls 字段（包含 step 信息）
    const urlsData = {
      ...(urls || {}),
      ...(step ? { step } : {}),
    };

    const updateData: Record<string, unknown> = {
      status,
      projectId: project_id,
      urls: urlsData,
    };

    if (status === 'completed') {
      // 只有当前状态不是 completed 时才更新和扣费
      const updated = await multipostDb.posterGeneration.updateMany({
        where: { id: posterTask.id, status: { not: PosterGenerationStatus.COMPLETED } },
        data: {
          status: PosterGenerationStatus.COMPLETED,
          projectId: project_id,
          urls: urlsData,
          lastImageUrl: urls?.image,
        },
      });

      // 只有成功更新了才扣积分（避免重复扣费）
      if (updated.count > 0) {
        try {
          await deductCredit({
            userId: posterTask.userId,
            type: 'IMAGE_GENERATION',
            amount: PRICING.POSTER_GENERATION,
          });
        } catch (error) {
          console.error('扣除积分失败:', error);
        }
      }

      return successResponse({});
    } else if (status === 'failed') {
      updateData.status = PosterGenerationStatus.FAILED;
      updateData.error = validatedData.error || 'Poster generation failed';
    }

    await multipostDb.posterGeneration.update({
      where: { id: posterTask.id },
      data: updateData,
    });

    return successResponse({});
  } catch (error) {
    console.error('处理Seede Webhook失败:', error);
    return errorResponse(error);
  }
}
