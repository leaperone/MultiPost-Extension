import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { PRICING } from '@/actions/credit/types';

import { deductCredit } from '../../../actions/credit/_core';
import { PosterGenerationStatus } from '../../../actions/draw/poster/types';
import { multipostDb } from '../../../lib/db';
import { errorResponse, successResponse } from '../../../lib/response';
import { safeCompareSecret } from '../../../lib/secret';

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

export const Route = createFileRoute('/api/seede/notify')({
  server: {
    handlers: {
      POST,
    },
  },
});

async function POST({ request }: { request: Request }) {
  try {
    const url = new URL(request.url);
    const secret = url.searchParams.get('secret');
    if (!safeCompareSecret(secret, process.env.SEEDE_WEBHOOK_SECRET)) {
      return new Response('Unauthorized', { status: 401 });
    }

    const payload = await request.json();
    const validatedData = SeedeWebhookSchema.parse(payload);

    const { task_id, status, step, urls, project_id } = validatedData;
    const posterTask = await multipostDb.posterGeneration.findFirst({
      where: { taskId: task_id },
    });

    if (!posterTask) {
      throw new Error('Task not found');
    }

    if (
      posterTask.status === PosterGenerationStatus.COMPLETED ||
      posterTask.status === PosterGenerationStatus.FAILED
    ) {
      return successResponse({});
    }

    const urlsData: Record<string, string> = {};
    if (urls?.task) {
      urlsData.task = urls.task;
    }
    if (urls?.image) {
      urlsData.image = urls.image;
    }
    if (urls?.project) {
      urlsData.project = urls.project;
    }
    if (step) {
      urlsData.step = step;
    }

    if (status === 'completed') {
      const updated = await multipostDb.posterGeneration.updateMany({
        where: { id: posterTask.id, status: { not: PosterGenerationStatus.COMPLETED } },
        data: {
          status: PosterGenerationStatus.COMPLETED,
          projectId: project_id,
          urls: urlsData,
          lastImageUrl: urls?.image,
        },
      });

      if (updated.count > 0) {
        try {
          await deductCredit({
            userId: posterTask.userId,
            type: 'POSTER_GENERATION',
            amount: PRICING.POSTER_GENERATION,
          });
        } catch (error) {
          console.error('扣除积分失败:', error);
        }
      }

      return successResponse({});
    }

    const updateData: {
      status: string;
      projectId: string;
      urls: Record<string, string>;
      error?: string;
    } = {
      status,
      projectId: project_id,
      urls: urlsData,
    };

    if (status === 'failed') {
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
