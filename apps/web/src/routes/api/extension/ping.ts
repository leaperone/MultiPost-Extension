import { createFileRoute } from '@tanstack/react-router';
import { ExtensionClient, ExtensionTask } from '@db/schema/schema';
import { and, asc, eq, isNull, lt } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { BASE_URL } from '@/lib/constants';
import { createTaskHandoffToken } from '@/lib/extension/taskHandoff.server';

import { authKey } from '../../../lib/authKey';
import { preflightResponse, withCors } from '../../../lib/cors';
import { db } from '../../../lib/db';
import { draftPostSchema, schedulePublishPostSchema, TaskStatus, TaskType } from './-types';

const schema = z.object({
  extensionClientId: z.string().optional(),
  platformInfos: z.any().optional(),
  extensionVersion: z.string().optional(),
});

const ACTIVE_TASK_TIMEOUT_MS = 20 * 60 * 1000;
const IMMEDIATE_TASK_TIMEOUT_MS = 24 * 60 * 60 * 1000;

export const Route = createFileRoute('/api/extension/ping')({
  server: {
    handlers: {
      OPTIONS: async () => preflightResponse(),
      POST,
    },
  },
});

async function taskNeedToHandle(targetClientId: string) {
  // Immediate tasks should not suddenly publish stale content when a client
  // comes back online days later. Scheduled and draft tasks keep their own
  // timestamp semantics and are not included in this expiry rule.
  await db
    .update(ExtensionTask)
    .set({
      status: TaskStatus.FAILED,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(ExtensionTask.targetClientId, targetClientId),
        eq(ExtensionTask.status, TaskStatus.PENDING),
        eq(ExtensionTask.taskType, TaskType.PUBLISH_POST),
        lt(ExtensionTask.createdAt, new Date(Date.now() - IMMEDIATE_TASK_TIMEOUT_MS)),
      ),
    );

  // An ACTIVE task normally lasts at most ten minutes while the handoff page
  // waits for a scheduled publish. If that page is closed, finish it as FAILED
  // so it never remains permanently active and invisible to the queue.
  await db
    .update(ExtensionTask)
    .set({
      status: TaskStatus.FAILED,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(ExtensionTask.targetClientId, targetClientId),
        eq(ExtensionTask.status, TaskStatus.ACTIVE),
        lt(ExtensionTask.updatedAt, new Date(Date.now() - ACTIVE_TASK_TIMEOUT_MS)),
      ),
    );

  const tasks = await db
    .select()
    .from(ExtensionTask)
    .where(and(eq(ExtensionTask.targetClientId, targetClientId), eq(ExtensionTask.status, TaskStatus.PENDING)))
    .orderBy(asc(ExtensionTask.createdAt));

  for (const task of tasks) {
    if (task.taskType === TaskType.PUBLISH_POST) {
      return task;
    }

    if (task.taskType === TaskType.SCHEDULE_PUBLISH_POST) {
      const schedulePublishPostData = schedulePublishPostSchema.safeParse(task.taskData);
      if (!schedulePublishPostData.success) {
        return task;
      }
      if (schedulePublishPostData.data.timestamp <= Date.now() + 10 * 60 * 1000) {
        return task;
      }
    }

    if (task.taskType === TaskType.DRAFT_POST) {
      const draftPostData = draftPostSchema.safeParse(task.taskData);
      if (!draftPostData.success) {
        return task;
      }
      if (draftPostData.data.timestamp <= Date.now() + 10 * 60 * 1000) {
        return task;
      }
    }
  }

  return null;
}

async function POST({ request }: { request: Request }) {
  const { success, userId, error } = await authKey(request);
  if (!success || !userId) {
    return withCors(
      Response.json({
        success: false,
        error,
      }),
    );
  }

  try {
    const body = await request.json();
    const { extensionClientId, platformInfos, extensionVersion } = schema.parse(body);

    if (!extensionClientId) {
      const [newClient] = await db
        .insert(ExtensionClient)
        .values({
          userId,
          name: `New Client ${nanoid(8)}`,
          platformInfos: {},
          extensionVersion,
        })
        .returning();
      return withCors(
        Response.json({
          success: true,
          data: {
            action: 'NEW_CLIENT',
            clientId: newClient?.id,
          },
        }),
      );
    }

    const [client] = await db
      .select()
      .from(ExtensionClient)
      .where(
        and(
          eq(ExtensionClient.id, extensionClientId),
          eq(ExtensionClient.userId, userId),
          isNull(ExtensionClient.deletedAt),
        ),
      )
      .limit(1);
    if (!client) {
      return withCors(
        Response.json({
          success: false,
          error: 'CLIENT_NOT_FOUND',
        }),
      );
    }

    const hasPlatformInfos = platformInfos !== undefined;
    await db
      .update(ExtensionClient)
      .set({
        extensionVersion,
        ...(hasPlatformInfos ? { platformInfos } : {}),
        updatedAt: new Date(),
      })
      .where(eq(ExtensionClient.id, extensionClientId));

    const task = await taskNeedToHandle(extensionClientId);

    if (task) {
      const handoffToken = createTaskHandoffToken({
        taskId: task.id,
        userId: task.userId,
        targetClientId: task.targetClientId,
      });
      return withCors(
        Response.json({
          success: true,
          data: {
            action: 'NEW_TASK',
            url:
              `${BASE_URL}/on-task?taskId=${encodeURIComponent(task.id)}` +
              `&handoffToken=${encodeURIComponent(handoffToken)}`,
          },
        }),
      );
    }

    if (hasPlatformInfos) {
      return withCors(
        Response.json({
          success: true,
          data: {
            action: 'UPDATE_PLATFORM_INFOS',
          },
        }),
      );
    }

    return withCors(
      Response.json({
        success: true,
        data: {
          action: 'PING_SUCCESS',
        },
      }),
    );
  } catch (error) {
    console.error('Error creating API key:', error);
    if (error instanceof z.ZodError) {
      return withCors(new Response(error.issues[0].message, { status: 400 }));
    }
    return withCors(new Response('Internal Server Error', { status: 500 }));
  }
}
