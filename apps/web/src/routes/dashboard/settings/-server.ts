import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

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

async function getServerContext() {
  const [{ prisma }, { getSession }] = await Promise.all([
    import('../../../lib/db'),
    import('../../../lib/session'),
  ]);

  return { prisma, getSession };
}

export const getClientSettingsData = createServerFn({ method: 'GET' }).handler(async () => {
  const { prisma, getSession } = await getServerContext();
  const session = await getSession();
  if (!session?.user?.id) {
    return {
      clients: [],
      clientCount: 0,
    };
  }

  const [clients, clientCount] = await Promise.all([
    prisma.extensionClient.findMany({
      where: { userId: session.user.id, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.extensionClient.count({
      where: { userId: session.user.id, deletedAt: null },
    }),
  ]);

  return {
    clientCount,
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
    const { prisma, getSession } = await getServerContext();
    const session = await getSession();
    if (!session?.user?.id) {
      throw new Error('Not authenticated');
    }

    const client = await prisma.extensionClient.findFirst({
      where: {
        id: data.clientId,
        userId: session.user.id,
      },
    });

    if (!client) {
      throw new Error('Client not found or you do not have permission to delete it.');
    }

    if (client.deletedAt) {
      return;
    }

    await prisma.extensionClient.update({
      where: { id: data.clientId },
      data: {
        deletedAt: new Date(),
      },
    });
  });

async function getTaskDisplayInfo(
  prisma: Awaited<ReturnType<typeof getServerContext>>['prisma'],
  task: {
    taskType: string;
    taskData: unknown;
  },
  userId: string,
) {
  const taskData = toRecord(task.taskData);

  if (task.taskType === 'DRAFT_POST' && typeof taskData.draftId === 'string') {
    try {
      const draft = await prisma.draft.findFirst({
        where: {
          id: taskData.draftId,
          userId,
        },
        select: {
          title: true,
        },
      });

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
    const { prisma, getSession } = await getServerContext();
    const session = await getSession();
    if (!session?.user?.id) {
      return null;
    }

    const client = await prisma.extensionClient.findFirst({
      where: {
        id: data.clientId,
        userId: session.user.id,
        deletedAt: null,
      },
    });

    if (!client) {
      return null;
    }

    const tasks = await prisma.extensionTask.findMany({
      where: {
        targetClientId: data.clientId,
        userId: session.user.id,
      },
      orderBy: { createdAt: 'desc' },
    });

    const tasksWithDisplayInfo = await Promise.all(
      tasks.map(async (task) => ({
        id: task.id,
        status: task.status,
        taskType: task.taskType,
        createdAt: toDateString(task.createdAt),
        updatedAt: toDateString(task.updatedAt),
        displayInfo: await getTaskDisplayInfo(prisma, task, session.user.id),
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
    const { prisma, getSession } = await getServerContext();
    const session = await getSession();
    if (!session?.user?.id) {
      throw new Error('Not authenticated');
    }

    const task = await prisma.extensionTask.findFirst({
      where: {
        id: data.taskId,
        userId: session.user.id,
      },
    });

    if (!task) {
      throw new Error('Task not found or you do not have permission to delete it.');
    }

    await prisma.extensionTask.delete({
      where: {
        id: data.taskId,
      },
    });
  });

export const deleteBatchTasks = createServerFn({ method: 'POST' })
  .validator(taskIdsSchema)
  .handler(async ({ data }) => {
    const { prisma, getSession } = await getServerContext();
    const session = await getSession();
    if (!session?.user?.id) {
      throw new Error('Not authenticated');
    }

    const tasks = await prisma.extensionTask.findMany({
      where: {
        id: {
          in: data.taskIds,
        },
        userId: session.user.id,
      },
      select: {
        id: true,
      },
    });

    if (tasks.length !== data.taskIds.length) {
      throw new Error('Some tasks not found or you do not have permission to delete them.');
    }

    await prisma.extensionTask.deleteMany({
      where: {
        id: {
          in: data.taskIds,
        },
        userId: session.user.id,
      },
    });
  });
