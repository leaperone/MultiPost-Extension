import { createFileRoute } from '@tanstack/react-router';

import { authKey } from '../../../lib/authKey';
import { preflightResponse, withCors } from '../../../lib/cors';
import { errorResponse, successResponse, unauthenticatedResponse } from '../../../lib/response';
import { DraftPostData, taskSchema, TaskStatus, TaskType } from './-types';

export const Route = createFileRoute('/api/extension/task')({
  server: {
    handlers: {
      OPTIONS: async () => preflightResponse(),
      POST,
      GET,
    },
  },
});

async function POST({ request }: { request: Request }) {
  const { userId } = await authKey(request);
  if (!userId) {
    return withCors(unauthenticatedResponse());
  }

  try {
    const { prisma } = await import('../../../lib/db');
    const body = await request.json();
    const validatedData = taskSchema.parse(body);

    const client = await prisma.extensionClient.findUnique({
      where: {
        id: validatedData.targetClientId,
        userId,
        deletedAt: null,
      },
    });
    if (!client) {
      throw new Error('CLIENT_NOT_FOUND');
    }

    if (validatedData.taskType === TaskType.DRAFT_POST) {
      if (!('draftId' in validatedData.taskData)) {
        throw new Error('DRAFT_ID_REQUIRED');
      }
      const draft = await prisma.draft.findUnique({
        where: {
          id: (validatedData.taskData as DraftPostData).draftId,
          userId,
        },
      });
      if (!draft) {
        throw new Error('DRAFT_NOT_FOUND');
      }
    }

    const task = await prisma.extensionTask.create({
      data: {
        userId,
        targetClientId: validatedData.targetClientId,
        taskType: validatedData.taskType,
        taskData: body.taskData,
        status: TaskStatus.PENDING,
      },
    });
    return withCors(
      successResponse({
        taskId: task.id,
        status: task.status,
      }),
    );
  } catch (error) {
    return withCors(errorResponse(error));
  }
}

async function GET({ request }: { request: Request }) {
  const { userId } = await authKey(request);
  if (!userId) {
    return withCors(unauthenticatedResponse());
  }

  const searchParams = new URL(request.url).searchParams;
  const taskId = searchParams.get('taskId');
  if (!taskId) {
    throw new Error('TASK_ID_REQUIRED');
  }
  try {
    const { prisma } = await import('../../../lib/db');
    const task = await prisma.extensionTask.findUnique({
      where: {
        id: taskId,
        userId,
      },
      select: {
        id: true,
        taskType: true,
        status: true,
        targetClientId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return withCors(successResponse(task));
  } catch (error) {
    return withCors(errorResponse(error));
  }
}
