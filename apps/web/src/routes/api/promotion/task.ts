import { createFileRoute } from '@tanstack/react-router';
import { fromDecimal } from '@db/helpers';
import { PromotionTask } from '@db/schema/schema';
import Decimal from 'decimal.js';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { isAdmin } from '../../../actions/admin';
import { db } from '../../../lib/db';
import { errorResponse, successResponse, unauthenticatedResponse } from '../../../lib/response';

const taskSchema = z.object({
  taskType: z.enum(['PUBLISH_POST', 'COMMENT_POST']),
  title: z.string(),
  description: z.string().optional(),
  link: z.string().url().optional(),
  keywords: z.array(z.string()),
  examples: z.array(z.string()),
  expiredAt: z.number(),
  reward: z.string().transform((val) => new Decimal(val)),
});

const updateTaskSchema = z.object({
  id: z.string(),
  ...taskSchema.shape,
});

export const Route = createFileRoute('/api/promotion/task')({
  server: {
    handlers: {
      POST,
      PUT,
    },
  },
});

async function requireAdminSession(request: Request) {
  const { getSessionFromRequest } = await import('../../../lib/session');
  const session = await getSessionFromRequest(request);
  if (!session?.user?.id || !session.user.email || !isAdmin(session.user.email)) {
    return null;
  }
  return session;
}

async function POST({ request }: { request: Request }) {
  const session = await requireAdminSession(request);
  if (!session) {
    return unauthenticatedResponse();
  }

  try {
    const body = await request.json();
    const validatedData = taskSchema.parse(body);

    const [task] = await db
      .insert(PromotionTask)
      .values({
        userId: session.user.id,
        ...validatedData,
        expiredAt: new Date(validatedData.expiredAt),
        reward: fromDecimal(validatedData.reward),
      })
      .returning();

    return successResponse({
      ...task,
      reward: task?.reward.toString(),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

async function PUT({ request }: { request: Request }) {
  const session = await requireAdminSession(request);
  if (!session) {
    return unauthenticatedResponse();
  }

  try {
    const body = await request.json();
    const validatedData = updateTaskSchema.parse(body);

    const [existingTask] = await db
      .select({ id: PromotionTask.id })
      .from(PromotionTask)
      .where(and(eq(PromotionTask.id, validatedData.id), eq(PromotionTask.userId, session.user.id)))
      .limit(1);

    if (!existingTask) {
      return errorResponse('Task not found');
    }

    const [task] = await db
      .update(PromotionTask)
      .set({
        taskType: validatedData.taskType,
        title: validatedData.title,
        description: validatedData.description,
        link: validatedData.link,
        keywords: validatedData.keywords,
        examples: validatedData.examples,
        expiredAt: new Date(validatedData.expiredAt),
        reward: fromDecimal(validatedData.reward),
        updatedAt: new Date(),
      })
      .where(and(eq(PromotionTask.id, validatedData.id), eq(PromotionTask.userId, session.user.id)))
      .returning();

    return successResponse({
      ...task,
      reward: task?.reward.toString(),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
