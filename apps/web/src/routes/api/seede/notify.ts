import { createFileRoute } from '@tanstack/react-router';
import { PosterGeneration } from '@db/schema/schema';
import { and, eq, ne } from 'drizzle-orm';
import { z } from 'zod';

import { PRICING } from '@/src/actions/credit/types';

import { deductCredit } from '../../../actions/credit/_core';
import { PosterGenerationStatus } from '../../../actions/draw/poster/types';
import { db } from '../../../lib/db';
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
    const [posterTask] = await db
      .select()
      .from(PosterGeneration)
      .where(eq(PosterGeneration.taskId, task_id))
      .limit(1);

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
      const updated = await db
        .update(PosterGeneration)
        .set({
          status: PosterGenerationStatus.COMPLETED,
          projectId: project_id,
          urls: urlsData,
          lastImageUrl: urls?.image,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(PosterGeneration.id, posterTask.id),
            ne(PosterGeneration.status, PosterGenerationStatus.COMPLETED),
          ),
        )
        .returning({ id: PosterGeneration.id });

      if (updated.length > 0) {
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

    await db
      .update(PosterGeneration)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(PosterGeneration.id, posterTask.id));

    return successResponse({});
  } catch (error) {
    console.error('处理Seede Webhook失败:', error);
    return errorResponse(error);
  }
}
