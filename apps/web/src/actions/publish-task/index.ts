import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { multipostDb } from '../../lib/db';
import { getSession } from '../../lib/session';

const createPublishTaskSchema = z.object({
  draftId: z.string().optional(),
  publishedAt: z.string().optional(),
  selectedAccountIds: z.array(z.string()).optional(),
});

const publishTaskIdSchema = z.object({
  taskId: z.string().min(1),
});

export const createPublishTask = createServerFn({ method: 'POST' })
  .validator(createPublishTaskSchema)
  .handler(async ({ data }) => {
    try {
      const session = await getSession();
      if (!session?.user?.id) {
        return {
          success: false,
          error: 'Authentication failed',
        };
      }

      const userId = session.user.id;
      const { draftId, publishedAt, selectedAccountIds } = data;

      if (!draftId || !publishedAt || !selectedAccountIds || !Array.isArray(selectedAccountIds)) {
        return {
          success: false,
          error: 'Missing required fields: draftId, publishedAt, selectedAccountIds',
        };
      }

      if (selectedAccountIds.length === 0) {
        return {
          success: false,
          error: 'At least one social media account must be selected',
        };
      }

      const draft = await multipostDb.draft.findFirst({
        where: {
          id: draftId,
          userId,
        },
      });

      if (!draft) {
        return {
          success: false,
          error: 'Draft not found or unauthorized',
        };
      }

      const accounts = await multipostDb.socialMediaAccount.findMany({
        where: {
          id: { in: selectedAccountIds },
          userId,
          isActive: true,
        },
      });

      if (accounts.length !== selectedAccountIds.length) {
        return {
          success: false,
          error: 'Some selected accounts are invalid or inactive',
        };
      }

      const publishTime = new Date(publishedAt);
      if (publishTime.getTime() <= Date.now()) {
        return {
          success: false,
          error: 'Publish time must be in the future',
        };
      }

      const result = await multipostDb.$transaction(async (tx) => {
        const publishTask = await tx.publishTask.create({
          data: {
            userId,
            draftId,
            publishedAt: publishTime,
            status: 'pending',
          },
        });

        const publishTaskLogs = await Promise.all(
          accounts.map((account) =>
            tx.publishTaskLog.create({
              data: {
                publishTaskId: publishTask.id,
                userId,
                platform: account.platform,
                platformId: account.platformId,
                status: 'pending',
              },
            }),
          ),
        );

        return {
          publishTask,
          publishTaskLogs,
        };
      });

      return {
        success: true,
        data: {
          publishTask: result.publishTask,
          logsCount: result.publishTaskLogs.length,
          platforms: accounts.map((a) => a.platform),
        },
      };
    } catch (error) {
      return {
        success: false,
      error: 'Failed to create publish task',
    };
  }
});

export const getScheduledTasks = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const publishTasks = await multipostDb.publishTask.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      draft: {
        select: {
          title: true,
          content: true,
        },
      },
      PublishTaskLog: {
        select: {
          id: true,
          platform: true,
          platformId: true,
          publishedAt: true,
          status: true,
          error: true,
          message: true,
        },
      },
    },
    orderBy: {
      publishedAt: 'asc',
    },
  });

  return publishTasks.map((task) => ({
    id: task.id,
    title: task.draft.title || `Publish Task ${task.id.slice(-6)}`,
    start: task.publishedAt.toISOString(),
    description:
      task.draft.content?.slice(0, 100) +
      (task.draft.content && task.draft.content.length > 100 ? '...' : ''),
    status: task.status,
    classNames: [`status-${task.status}`],
    extendedProps: {
      draftId: task.draftId,
      status: task.status,
      content: task.draft.content,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      publishTaskLogs: task.PublishTaskLog.map((log) => ({
        ...log,
        publishedAt: log.publishedAt?.toISOString() ?? null,
      })),
    },
  }));
});

export const getPublishTaskDetail = createServerFn({ method: 'GET' })
  .validator(publishTaskIdSchema)
  .handler(async ({ data }) => {
    const session = await getSession();
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const task = await multipostDb.publishTask.findFirst({
      where: {
        id: data.taskId,
        userId: session.user.id,
      },
      include: {
        draft: true,
        PublishTaskLog: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    return {
      ...task,
      publishedAt: task.publishedAt.toISOString(),
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      draft: {
        ...task.draft,
        createdAt: task.draft.createdAt.toISOString(),
        updatedAt: task.draft.updatedAt.toISOString(),
      },
      PublishTaskLog: task.PublishTaskLog.map((log) => ({
        ...log,
        publishedAt: log.publishedAt?.toISOString() ?? null,
        createdAt: log.createdAt.toISOString(),
        updatedAt: log.updatedAt.toISOString(),
      })),
    };
  });

export const cancelPublishTask = createServerFn({ method: 'POST' })
  .validator(publishTaskIdSchema)
  .handler(async ({ data }) => {
    const session = await getSession();
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    try {
      const task = await multipostDb.publishTask.findFirst({
        where: {
          id: data.taskId,
          userId: session.user.id,
        },
      });

      if (!task) {
        return {
          success: false,
          error: 'Task not found',
        };
      }

      if (task.status !== 'pending') {
        return {
          success: false,
          error: 'Only pending tasks can be cancelled',
        };
      }

      await multipostDb.publishTask.update({
        where: {
          id: data.taskId,
        },
        data: {
          status: 'cancelled',
          updatedAt: new Date(),
        },
      });

      await multipostDb.publishTaskLog.updateMany({
        where: {
          publishTaskId: data.taskId,
          status: 'pending',
        },
        data: {
          status: 'cancelled',
          updatedAt: new Date(),
        },
      });

      return {
        success: true,
        message: 'Task cancelled',
      };
    } catch (error) {
      console.error('Error cancelling task:', error);
      return {
        success: false,
        error: 'Failed to cancel task',
      };
    }
  });

export const restartPublishTask = createServerFn({ method: 'POST' })
  .validator(publishTaskIdSchema)
  .handler(async ({ data }) => {
    const session = await getSession();
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    try {
      const task = await multipostDb.publishTask.findFirst({
        where: {
          id: data.taskId,
          userId: session.user.id,
        },
      });

      if (!task) {
        return {
          success: false,
          error: 'Task not found',
        };
      }

      if (task.status !== 'cancelled' && task.status !== 'failed') {
        return {
          success: false,
          error: 'Only cancelled or failed tasks can be restarted',
        };
      }

      await multipostDb.publishTask.update({
        where: {
          id: data.taskId,
        },
        data: {
          status: 'pending',
          updatedAt: new Date(),
        },
      });

      await multipostDb.publishTaskLog.updateMany({
        where: {
          publishTaskId: data.taskId,
          status: {
            in: ['cancelled', 'failed'],
          },
        },
        data: {
          status: 'pending',
          updatedAt: new Date(),
        },
      });

      return {
        success: true,
        message: 'Task restarted',
      };
    } catch (error) {
      console.error('Error restarting task:', error);
      return {
        success: false,
        error: 'Failed to restart task',
      };
    }
  });
