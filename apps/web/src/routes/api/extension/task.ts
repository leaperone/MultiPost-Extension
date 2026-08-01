import { createFileRoute } from '@tanstack/react-router';
import type { JsonValue } from '@db/helpers';
import { Draft, ExtensionClient, ExtensionTask } from '@db/schema/schema';
import { and, eq, isNull } from 'drizzle-orm';

import { authKey } from '../../../lib/authKey';
import { preflightResponse, withCors } from '../../../lib/cors';
import { db } from '../../../lib/db';
import { errorResponse, successResponse, unauthenticatedResponse } from '../../../lib/response';
import { taskSchema, TaskStatus, TaskType } from './-types';

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
    const body = await request.json();
    const validatedData = taskSchema.parse(body);

    const [client] = await db
      .select()
      .from(ExtensionClient)
      .where(
        and(
          eq(ExtensionClient.id, validatedData.targetClientId),
          eq(ExtensionClient.userId, userId),
          isNull(ExtensionClient.deletedAt),
        ),
      )
      .limit(1);
    if (!client) {
      throw new Error('CLIENT_NOT_FOUND');
    }

    if (validatedData.taskType === TaskType.DRAFT_POST) {
      const [draft] = await db
        .select()
        .from(Draft)
        .where(and(eq(Draft.id, validatedData.taskData.draftId), eq(Draft.userId, userId)))
        .limit(1);
      if (!draft) {
        throw new Error('DRAFT_NOT_FOUND');
      }
    }

    const [task] = await db
      .insert(ExtensionTask)
      .values({
        userId,
        targetClientId: validatedData.targetClientId,
        taskType: validatedData.taskType,
        taskData: validatedData.taskData as JsonValue,
        status: TaskStatus.PENDING,
      })
      .returning();
    return withCors(
      successResponse({
        taskId: task?.id,
        status: task?.status,
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
    const [task] = await db
      .select({
        id: ExtensionTask.id,
        taskType: ExtensionTask.taskType,
        status: ExtensionTask.status,
        targetClientId: ExtensionTask.targetClientId,
        createdAt: ExtensionTask.createdAt,
        updatedAt: ExtensionTask.updatedAt,
      })
      .from(ExtensionTask)
      .where(and(eq(ExtensionTask.id, taskId), eq(ExtensionTask.userId, userId)))
      .limit(1);
    return withCors(successResponse(task));
  } catch (error) {
    return withCors(errorResponse(error));
  }
}
