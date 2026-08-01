import { createServerFn } from '@tanstack/react-start';
import type { JsonValue } from '@db/helpers';
import { Draft, ExtensionTask } from '@db/schema/schema';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/lib/db';
import { getSession } from '@/lib/session';
import { verifyTaskHandoffToken } from '@/lib/extension/taskHandoff.server';
import { draftPostSchema, TaskStatus, TaskType } from '@/routes/api/extension/-types';

const taskAccessSchema = z.object({
  taskId: z.string().min(1),
  handoffToken: z.string().min(1).optional(),
});

const updateTaskStatusSchema = taskAccessSchema.extend({
  status: z.enum([TaskStatus.DONE, TaskStatus.FAILED]),
});

interface ExtensionTaskRecord {
  id: string;
  userId: string;
  targetClientId: string;
  taskType: string;
  taskData: JsonValue;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExtensionTaskData {
  id: string;
  taskType: string;
  taskData: JsonValue;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface TaskAccessResult {
  task: ExtensionTaskRecord | null;
  error: 'UNAUTHORIZED' | 'NOT_FOUND' | null;
}

async function findTask(taskId: string): Promise<ExtensionTaskRecord | null> {
  const [task] = await db
    .select({
      id: ExtensionTask.id,
      userId: ExtensionTask.userId,
      targetClientId: ExtensionTask.targetClientId,
      taskType: ExtensionTask.taskType,
      taskData: ExtensionTask.taskData,
      status: ExtensionTask.status,
      createdAt: ExtensionTask.createdAt,
      updatedAt: ExtensionTask.updatedAt,
    })
    .from(ExtensionTask)
    .where(eq(ExtensionTask.id, taskId))
    .limit(1);

  return task ?? null;
}

async function authorizeTask(data: z.infer<typeof taskAccessSchema>): Promise<TaskAccessResult> {
  const task = await findTask(data.taskId);
  if (!task) {
    return { task: null, error: 'NOT_FOUND' };
  }

  const hasValidHandoff = data.handoffToken
    ? verifyTaskHandoffToken(data.handoffToken, {
        taskId: task.id,
        userId: task.userId,
        targetClientId: task.targetClientId,
      })
    : false;

  if (hasValidHandoff) {
    return { task, error: null };
  }

  const session = await getSession();
  if (session?.user?.id === task.userId) {
    return { task, error: null };
  }

  return { task: null, error: 'UNAUTHORIZED' };
}

function serializeTask(task: ExtensionTaskRecord): ExtensionTaskData {
  return {
    id: task.id,
    taskType: task.taskType,
    taskData: task.taskData,
    status: task.status,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export const getExtensionTask = createServerFn({ method: 'GET' })
  .validator(taskAccessSchema)
  .handler(async ({ data }) => {
    const result = await authorizeTask(data);
    if (!result.task) {
      return {
        success: false as const,
        error: result.error,
      };
    }

    return {
      success: true as const,
      task: serializeTask(result.task),
    };
  });

export const claimExtensionTask = createServerFn({ method: 'POST' })
  .validator(taskAccessSchema)
  .handler(async ({ data }) => {
    const result = await authorizeTask(data);
    if (!result.task) {
      return {
        success: false as const,
        error: result.error,
      };
    }

    const [claimedTask] = await db
      .update(ExtensionTask)
      .set({
        status: TaskStatus.ACTIVE,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(ExtensionTask.id, result.task.id),
          eq(ExtensionTask.userId, result.task.userId),
          eq(ExtensionTask.targetClientId, result.task.targetClientId),
          eq(ExtensionTask.status, TaskStatus.PENDING),
        ),
      )
      .returning({
        id: ExtensionTask.id,
      });

    return {
      success: true as const,
      claimed: Boolean(claimedTask),
    };
  });

export const getExtensionTaskDraft = createServerFn({ method: 'GET' })
  .validator(taskAccessSchema)
  .handler(async ({ data }) => {
    const result = await authorizeTask(data);
    if (!result.task) {
      return {
        success: false as const,
        error: result.error,
      };
    }

    if (result.task.taskType !== TaskType.DRAFT_POST || result.task.status !== TaskStatus.ACTIVE) {
      return {
        success: false as const,
        error: 'INVALID_TASK' as const,
      };
    }

    const parsedTaskData = draftPostSchema.safeParse(result.task.taskData);
    if (!parsedTaskData.success) {
      return {
        success: false as const,
        error: 'INVALID_TASK' as const,
      };
    }

    const [draft] = await db
      .select({
        id: Draft.id,
        title: Draft.title,
        content: Draft.content,
        files: Draft.files,
      })
      .from(Draft)
      .where(and(eq(Draft.id, parsedTaskData.data.draftId), eq(Draft.userId, result.task.userId)))
      .limit(1);

    if (!draft) {
      return {
        success: false as const,
        error: 'DRAFT_NOT_FOUND' as const,
      };
    }

    return {
      success: true as const,
      draft,
    };
  });

export const updateExtensionTaskStatus = createServerFn({ method: 'POST' })
  .validator(updateTaskStatusSchema)
  .handler(async ({ data }) => {
    const result = await authorizeTask(data);
    if (!result.task) {
      return {
        success: false as const,
        error: result.error,
      };
    }

    if (result.task.status === data.status) {
      return {
        success: true as const,
        updated: true,
      };
    }

    if (result.task.status !== TaskStatus.ACTIVE) {
      return {
        success: true as const,
        updated: false,
      };
    }

    const [updatedTask] = await db
      .update(ExtensionTask)
      .set({
        status: data.status,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(ExtensionTask.id, result.task.id),
          eq(ExtensionTask.userId, result.task.userId),
          eq(ExtensionTask.targetClientId, result.task.targetClientId),
          eq(ExtensionTask.status, TaskStatus.ACTIVE),
        ),
      )
      .returning({
        id: ExtensionTask.id,
      });

    return {
      success: true as const,
      updated: Boolean(updatedTask),
    };
  });
