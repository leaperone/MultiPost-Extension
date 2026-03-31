'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { createTranslation } from '@/i18n/server';

/**
 * Get all scheduled tasks for the user
 * @returns Array of scheduled tasks formatted for FullCalendar
 */
export async function getScheduledTasks() {
  const session = await auth();
  const { t } = await createTranslation('schedule');

  if (!session?.user?.id) {
    throw new Error(t('errors.unauthorized'));
  }

  const publishTasks = await prisma.publishTask.findMany({
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

  // Transform data for FullCalendar
  return publishTasks.map((task) => ({
    id: task.id,
    title: task.draft.title || `${t('calendar.publishTask')} ${task.id.slice(-6)}`,
    start: task.publishedAt.toISOString(),
    description:
      task.draft.content?.slice(0, 100) + (task.draft.content && task.draft.content.length > 100 ? '...' : ''),
    status: task.status,
    classNames: [`status-${task.status}`],
    extendedProps: {
      draftId: task.draftId,
      status: task.status,
      content: task.draft.content,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      publishTaskLogs: task.PublishTaskLog,
    },
  }));
}

export async function getPublishTaskDetail(taskId: string) {
  const session = await auth();
  const { t } = await createTranslation('schedule');

  if (!session?.user?.id) {
    throw new Error(t('errors.unauthorized'));
  }

  const task = await prisma.publishTask.findFirst({
    where: {
      id: taskId,
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
    throw new Error(t('errors.taskNotFound'));
  }

  return task;
}

/**
 * Cancel a pending publish task
 * @param taskId - The task ID to cancel
 * @returns Success status and message
 */
export async function cancelPublishTask(taskId: string) {
  const session = await auth();
  const { t } = await createTranslation('schedule');

  if (!session?.user?.id) {
    throw new Error(t('errors.unauthorized'));
  }

  try {
    // Check if task exists and belongs to user
    const task = await prisma.publishTask.findFirst({
      where: {
        id: taskId,
        userId: session.user.id,
      },
    });

    if (!task) {
      return {
        success: false,
        error: t('errors.taskNotFound'),
      };
    }

    // Only allow cancellation of pending tasks
    if (task.status !== 'pending') {
      return {
        success: false,
        error: t('errors.onlyPendingCanCancel'),
      };
    }

    // Update task status to cancelled
    await prisma.publishTask.update({
      where: {
        id: taskId,
      },
      data: {
        status: 'cancelled',
        updatedAt: new Date(),
      },
    });

    // Also update all pending publish task logs to cancelled
    await prisma.publishTaskLog.updateMany({
      where: {
        publishTaskId: taskId,
        status: 'pending',
      },
      data: {
        status: 'cancelled',
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      message: t('messages.taskCancelled'),
    };
  } catch (error) {
    console.error('Error cancelling task:', error);
    return {
      success: false,
      error: t('errors.failedToCancel'),
    };
  }
}

/**
 * Restart a cancelled or failed publish task
 * @param taskId - The task ID to restart
 * @returns Success status and message
 */
export async function restartPublishTask(taskId: string) {
  const session = await auth();
  const { t } = await createTranslation('schedule');

  if (!session?.user?.id) {
    throw new Error(t('errors.unauthorized'));
  }

  try {
    // Check if task exists and belongs to user
    const task = await prisma.publishTask.findFirst({
      where: {
        id: taskId,
        userId: session.user.id,
      },
    });

    if (!task) {
      return {
        success: false,
        error: t('errors.taskNotFound'),
      };
    }

    // Only allow restart of cancelled or failed tasks
    if (task.status !== 'cancelled' && task.status !== 'failed') {
      return {
        success: false,
        error: t('errors.onlyCancelledOrFailedCanRestart'),
      };
    }

    // Update task status to pending
    await prisma.publishTask.update({
      where: {
        id: taskId,
      },
      data: {
        status: 'pending',
        updatedAt: new Date(),
      },
    });

    // Also update all cancelled or failed publish task logs to pending
    await prisma.publishTaskLog.updateMany({
      where: {
        publishTaskId: taskId,
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
      message: t('messages.taskRestarted'),
    };
  } catch (error) {
    console.error('Error restarting task:', error);
    return {
      success: false,
      error: t('errors.failedToRestart'),
    };
  }
}

/**
 * Get a social media account by platform and platformId
 * @param platform - The platform name
 * @param platformId - The platform account id
 * @returns Social media account or null
 */
export async function getSocialMediaAccountByPlatformId(platform: string, platformId: string) {
  const session = await auth();
  const { t } = await createTranslation('schedule');

  if (!session?.user?.id) {
    throw new Error(t('errors.unauthorized'));
  }

  try {
    const account = await prisma.socialMediaAccount.findFirst({
      where: {
        userId: session.user.id,
        platform,
        platformId,
      },
      select: {
        id: true,
        platform: true,
        platformId: true,
        displayName: true,
        username: true,
      },
    });
    return {
      success: true,
      account,
    };
  } catch (error) {
    console.error('Error fetching social media account:', error);
    return {
      success: false,
      error: t('errors.failedToFetchAccounts'),
      account: null,
    };
  }
}
