import { multipostDb } from '@/lib/db';
import { authKey } from '@/actions/authKey';
import { errorResponse, successResponse, unauthenticatedResponse } from '@/lib/response';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';
import { isAdmin } from '@/actions/admin';

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

export async function POST(request: Request) {
  const { userId, email } = await authKey(request);
  if (!userId) {
    return unauthenticatedResponse();
  }

  if (!email || !isAdmin(email)) {
    return unauthenticatedResponse();
  }

  try {
    const body = await request.json();
    const validatedData = taskSchema.parse(body);

    const task = await multipostDb.promotionTask.create({
      data: {
        userId,
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

const updateTaskSchema = z.object({
  id: z.string(),
  ...taskSchema.shape,
});

export async function PUT(request: Request) {
  const { userId } = await authKey(request);
  if (!userId) {
    return unauthenticatedResponse();
  }

  try {
    const body = await request.json();
    const validatedData = updateTaskSchema.parse(body);

    const existingTask = await multipostDb.promotionTask.findUnique({
      where: {
        id: validatedData.id,
        userId,
      },
    });

    if (!existingTask) {
      return errorResponse('Task not found');
    }

    const task = await multipostDb.promotionTask.update({
      where: {
        id: validatedData.id,
        userId,
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
