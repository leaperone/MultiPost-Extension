import { createServerFn } from '@tanstack/react-start';
import { Draft, PublishTask, PublishTaskLog, SocialMediaAccount } from '@db/schema/schema';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../../lib/db';
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

      const [draft] = await db
        .select()
        .from(Draft)
        .where(and(eq(Draft.id, draftId), eq(Draft.userId, userId)))
        .limit(1);

      if (!draft) {
        return {
          success: false,
          error: 'Draft not found or unauthorized',
        };
      }

      const accounts = await db
        .select()
        .from(SocialMediaAccount)
        .where(
          and(
            inArray(SocialMediaAccount.id, selectedAccountIds),
            eq(SocialMediaAccount.userId, userId),
            eq(SocialMediaAccount.isActive, true),
          ),
        );

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

      const result = await db.transaction(async (tx) => {
        const [publishTask] = await tx
          .insert(PublishTask)
          .values({
            userId,
            draftId,
            publishedAt: publishTime,
            status: 'pending',
          })
          .returning();

        if (!publishTask) {
          throw new Error('Failed to create publish task');
        }

        const publishTaskLogs = await tx
          .insert(PublishTaskLog)
          .values(
            accounts.map((account) => ({
                publishTaskId: publishTask.id,
                userId,
                platform: account.platform,
                platformId: account.platformId,
                status: 'pending',
            })),
          )
          .returning();

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

  const publishTasks = await db
    .select()
    .from(PublishTask)
    .where(eq(PublishTask.userId, session.user.id))
    .orderBy(asc(PublishTask.publishedAt));

  const draftIds = publishTasks.map((task) => task.draftId);
  const taskIds = publishTasks.map((task) => task.id);
  const [drafts, logs] = taskIds.length
    ? await Promise.all([
        db
          .select({
            id: Draft.id,
            title: Draft.title,
            content: Draft.content,
          })
          .from(Draft)
          .where(inArray(Draft.id, draftIds)),
        db
          .select({
            id: PublishTaskLog.id,
            publishTaskId: PublishTaskLog.publishTaskId,
            platform: PublishTaskLog.platform,
            platformId: PublishTaskLog.platformId,
            publishedAt: PublishTaskLog.publishedAt,
            status: PublishTaskLog.status,
            error: PublishTaskLog.error,
            message: PublishTaskLog.message,
          })
          .from(PublishTaskLog)
          .where(inArray(PublishTaskLog.publishTaskId, taskIds)),
      ])
    : [[], []];

  const draftById = new Map(drafts.map((draft) => [draft.id, draft]));
  const logsByTaskId = new Map<string, typeof logs>();
  for (const log of logs) {
    const grouped = logsByTaskId.get(log.publishTaskId) ?? [];
    grouped.push(log);
    logsByTaskId.set(log.publishTaskId, grouped);
  }

  return publishTasks.map((task) => ({
    id: task.id,
    title: draftById.get(task.draftId)?.title || `Publish Task ${task.id.slice(-6)}`,
    start: task.publishedAt.toISOString(),
    description:
      draftById.get(task.draftId)?.content?.slice(0, 100) +
      (draftById.get(task.draftId)?.content && draftById.get(task.draftId)!.content!.length > 100 ? '...' : ''),
    status: task.status,
    classNames: [`status-${task.status}`],
    extendedProps: {
      draftId: task.draftId,
      status: task.status,
      content: draftById.get(task.draftId)?.content,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      publishTaskLogs: (logsByTaskId.get(task.id) ?? []).map((log) => ({
        ...log,
        publishTaskId: undefined,
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

    const [task] = await db
      .select()
      .from(PublishTask)
      .where(and(eq(PublishTask.id, data.taskId), eq(PublishTask.userId, session.user.id)))
      .limit(1);

    if (!task) {
      throw new Error('Task not found');
    }

    const [draft] = await db.select().from(Draft).where(eq(Draft.id, task.draftId)).limit(1);
    const logs = await db
      .select()
      .from(PublishTaskLog)
      .where(eq(PublishTaskLog.publishTaskId, task.id))
      .orderBy(desc(PublishTaskLog.createdAt));

    return {
      ...task,
      publishedAt: task.publishedAt.toISOString(),
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      draft: {
        ...draft,
        createdAt: draft?.createdAt.toISOString(),
        updatedAt: draft?.updatedAt.toISOString(),
      },
      PublishTaskLog: logs.map((log) => ({
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
      const [task] = await db
        .select()
        .from(PublishTask)
        .where(and(eq(PublishTask.id, data.taskId), eq(PublishTask.userId, session.user.id)))
        .limit(1);

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

      await db
        .update(PublishTask)
        .set({
          status: 'cancelled',
          updatedAt: new Date(),
        })
        .where(eq(PublishTask.id, data.taskId));

      await db
        .update(PublishTaskLog)
        .set({
          status: 'cancelled',
          updatedAt: new Date(),
        })
        .where(and(eq(PublishTaskLog.publishTaskId, data.taskId), eq(PublishTaskLog.status, 'pending')));

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
      const [task] = await db
        .select()
        .from(PublishTask)
        .where(and(eq(PublishTask.id, data.taskId), eq(PublishTask.userId, session.user.id)))
        .limit(1);

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

      await db
        .update(PublishTask)
        .set({
          status: 'pending',
          updatedAt: new Date(),
        })
        .where(eq(PublishTask.id, data.taskId));

      await db
        .update(PublishTaskLog)
        .set({
          status: 'pending',
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(PublishTaskLog.publishTaskId, data.taskId),
            inArray(PublishTaskLog.status, ['cancelled', 'failed']),
          ),
        );

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
