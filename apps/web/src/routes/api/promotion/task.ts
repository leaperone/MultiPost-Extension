import { Decimal } from '@prisma/client/runtime/library';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { isAdmin } from '../../../actions/admin';
import { multipostDb } from '../../../lib/db';
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

    const task = await multipostDb.promotionTask.create({
      data: {
        userId: session.user.id,
        ...validatedData,
        expiredAt: new Date(validatedData.expiredAt),
      },
    });

    return successResponse({
      ...task,
      reward: task.reward.toString(),
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

    const existingTask = await multipostDb.promotionTask.findUnique({
      where: {
        id: validatedData.id,
        userId: session.user.id,
      },
    });

    if (!existingTask) {
      return errorResponse('Task not found');
    }

    const task = await multipostDb.promotionTask.update({
      where: {
        id: validatedData.id,
        userId: session.user.id,
      },
      data: {
        taskType: validatedData.taskType,
        title: validatedData.title,
        description: validatedData.description,
        link: validatedData.link,
        keywords: validatedData.keywords,
        examples: validatedData.examples,
        expiredAt: new Date(validatedData.expiredAt),
        reward: validatedData.reward,
      },
    });

    return successResponse({
      ...task,
      reward: task.reward.toString(),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
