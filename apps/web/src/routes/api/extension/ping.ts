import { createFileRoute } from '@tanstack/react-router';
import { Draft, ExtensionClient, ExtensionTask } from '@db/schema/schema';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { BASE_URL } from '@/lib/constants';

import { authKey } from '../../../lib/authKey';
import { preflightResponse, withCors } from '../../../lib/cors';
import { db } from '../../../lib/db';
import { DraftPostData, SchedulePublishPostData, TaskStatus, TaskType } from './-types';

const schema = z.object({
  extensionClientId: z.string().optional(),
  platformInfos: z.any().optional(),
  extensionVersion: z.string().optional(),
});

export const Route = createFileRoute('/api/extension/ping')({
  server: {
    handlers: {
      OPTIONS: async () => preflightResponse(),
      POST,
    },
  },
});

async function taskNeedToHandle(targetClientId: string) {
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
      const schedulePublishPostData = task.taskData as unknown as SchedulePublishPostData;
      if (schedulePublishPostData.timestamp <= Date.now() + 10 * 60 * 1000) {
        return task;
      }
    }

    if (task.taskType === TaskType.DRAFT_POST) {
      const draftPostData = task.taskData as unknown as DraftPostData;
      const [draft] = await db.select().from(Draft).where(eq(Draft.id, draftPostData.draftId)).limit(1);
      if (draft && draftPostData.timestamp <= Date.now() + 10 * 60 * 1000) {
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

    await db
      .update(ExtensionClient)
      .set({
        extensionVersion,
        updatedAt: new Date(),
      })
      .where(eq(ExtensionClient.id, extensionClientId));

    if (platformInfos) {
      await db
        .update(ExtensionClient)
        .set({
          extensionVersion,
          platformInfos,
          updatedAt: new Date(),
        })
        .where(eq(ExtensionClient.id, extensionClientId));
      return withCors(
        Response.json({
          success: true,
          data: {
            action: 'UPDATE_PLATFORM_INFOS',
          },
        }),
      );
    }

    const task = await taskNeedToHandle(extensionClientId);

    if (task) {
      return withCors(
        Response.json({
          success: true,
          data: {
            action: 'NEW_TASK',
            url: `${BASE_URL}/on-task?taskId=${task.id}`,
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
