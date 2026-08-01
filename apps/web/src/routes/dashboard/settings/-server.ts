import { createServerFn } from '@tanstack/react-start';
import { Draft, ExtensionClient, ExtensionTask } from '@db/schema/schema';
import { and, count, desc, eq, inArray, isNull } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../../../lib/db';
import { getSession } from '../../../lib/session';

const CLIENT_ONLINE_WINDOW_MS = 2 * 60 * 1000;

const clientIdSchema = z.object({
  clientId: z.string().min(1),
});

const taskIdSchema = z.object({
  taskId: z.string().min(1),
});

const taskIdsSchema = z.object({
  taskIds: z.array(z.string().min(1)).min(1),
});

type JsonRecord = Record<string, unknown>;

function toRecord(value: unknown): JsonRecord {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as JsonRecord;
  }
  return {};
}

function toDateString(value: Date) {
  return value.toISOString();
}

export const getClientSettingsData = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await getSession();
  if (!session?.user?.id) {
    return {
      clients: [],
      clientCount: 0,
      activeClientCount: 0,
    };
  }

  const [clients, clientCount] = await Promise.all([
    db
      .select()
      .from(ExtensionClient)
      .where(and(eq(ExtensionClient.userId, session.user.id), isNull(ExtensionClient.deletedAt)))
      .orderBy(desc(ExtensionClient.updatedAt)),
    db
      .select({ value: count() })
      .from(ExtensionClient)
      .where(and(eq(ExtensionClient.userId, session.user.id), isNull(ExtensionClient.deletedAt))),
  ]);

  return {
    clientCount: clientCount[0]?.value ?? 0,
    activeClientCount: clients.filter((client) => client.updatedAt.getTime() >= Date.now() - CLIENT_ONLINE_WINDOW_MS)
      .length,
    clients: clients.map((client) => ({
      id: client.id,
      name: client.name,
      extensionVersion: client.extensionVersion,
      createdAt: toDateString(client.createdAt),
      updatedAt: toDateString(client.updatedAt),
    })),
  };
});

export const deleteClient = createServerFn({ method: 'POST' })
  .validator(clientIdSchema)
  .handler(async ({ data }) => {
    const session = await getSession();
    if (!session?.user?.id) {
      throw new Error('Not authenticated');
    }

    const [client] = await db
      .select()
      .from(ExtensionClient)
      .where(and(eq(ExtensionClient.id, data.clientId), eq(ExtensionClient.userId, session.user.id)))
      .limit(1);

    if (!client) {
      throw new Error('Client not found or you do not have permission to delete it.');
    }

    if (client.deletedAt) {
      return;
    }

    await db
      .update(ExtensionClient)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(ExtensionClient.id, data.clientId));
  });

async function getTaskDisplayInfo(
  task: {
    taskType: string;
    taskData: unknown;
  },
  userId: string,
) {
  const taskData = toRecord(task.taskData);

  if (task.taskType === 'DRAFT_POST' && typeof taskData.draftId === 'string') {
    try {
      const [draft] = await db
        .select({
          title: Draft.title,
        })
        .from(Draft)
        .where(and(eq(Draft.id, taskData.draftId), eq(Draft.userId, userId)))
        .limit(1);

      return {
        title: draft?.title || 'Untitled Draft',
        timestamp: typeof taskData.timestamp === 'number' ? taskData.timestamp : undefined,
      };
    } catch {
      return {
        title: 'Draft Task',
        timestamp: typeof taskData.timestamp === 'number' ? taskData.timestamp : undefined,
      };
    }
  }

  const nestedData = toRecord(taskData.data);
  if (typeof nestedData.title === 'string') {
    return {
      title: nestedData.title,
      timestamp: typeof taskData.timestamp === 'number' ? taskData.timestamp : undefined,
    };
  }

  return {
    title: `${task.taskType.replace(/_/g, ' ')} Task`,
    timestamp: typeof taskData.timestamp === 'number' ? taskData.timestamp : undefined,
  };
}

export const getClientDetails = createServerFn({ method: 'GET' })
  .validator(clientIdSchema)
  .handler(async ({ data }) => {
    const session = await getSession();
    if (!session?.user?.id) {
      return null;
    }

    const [client] = await db
      .select()
      .from(ExtensionClient)
      .where(
        and(
          eq(ExtensionClient.id, data.clientId),
          eq(ExtensionClient.userId, session.user.id),
          isNull(ExtensionClient.deletedAt),
        ),
      )
      .limit(1);

    if (!client) {
      return null;
    }

    const tasks = await db
      .select()
      .from(ExtensionTask)
      .where(and(eq(ExtensionTask.targetClientId, data.clientId), eq(ExtensionTask.userId, session.user.id)))
      .orderBy(desc(ExtensionTask.createdAt));

    const tasksWithDisplayInfo = await Promise.all(
      tasks.map(async (task) => ({
        id: task.id,
        status: task.status,
        taskType: task.taskType,
        createdAt: toDateString(task.createdAt),
        updatedAt: toDateString(task.updatedAt),
        displayInfo: await getTaskDisplayInfo(task, session.user.id),
      })),
    );

    return {
      client: {
        id: client.id,
        name: client.name,
        extensionVersion: client.extensionVersion,
        createdAt: toDateString(client.createdAt),
        updatedAt: toDateString(client.updatedAt),
      },
      taskCount: tasksWithDisplayInfo.length,
      tasks: tasksWithDisplayInfo,
    };
  });

export const deleteTask = createServerFn({ method: 'POST' })
  .validator(taskIdSchema)
  .handler(async ({ data }) => {
    const session = await getSession();
    if (!session?.user?.id) {
      throw new Error('Not authenticated');
    }

    const [task] = await db
      .select()
      .from(ExtensionTask)
      .where(and(eq(ExtensionTask.id, data.taskId), eq(ExtensionTask.userId, session.user.id)))
      .limit(1);

    if (!task) {
      throw new Error('Task not found or you do not have permission to delete it.');
    }

    await db.delete(ExtensionTask).where(eq(ExtensionTask.id, data.taskId));
  });

export const deleteBatchTasks = createServerFn({ method: 'POST' })
  .validator(taskIdsSchema)
  .handler(async ({ data }) => {
    const session = await getSession();
    if (!session?.user?.id) {
      throw new Error('Not authenticated');
    }

    const tasks = await db
      .select({
        id: ExtensionTask.id,
      })
      .from(ExtensionTask)
      .where(and(inArray(ExtensionTask.id, data.taskIds), eq(ExtensionTask.userId, session.user.id)));

    if (tasks.length !== data.taskIds.length) {
      throw new Error('Some tasks not found or you do not have permission to delete them.');
    }

    await db
      .delete(ExtensionTask)
      .where(and(inArray(ExtensionTask.id, data.taskIds), eq(ExtensionTask.userId, session.user.id)));
  });
