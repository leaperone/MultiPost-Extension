'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { TaskStatus, TaskType, SchedulePublishPostData } from './types';

export async function taskNeedToHandle(targetClientId: string) {
  const task = await prisma.extensionTask.findFirst({
    where: {
      targetClientId,
      status: TaskStatus.PENDING,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  if (!task) {
    return null;
  }

  if (task.taskType === TaskType.PUBLISH_POST) {
    return task;
  }

  if (task.taskType === TaskType.SCHEDULE_PUBLISH_POST) {
    const schedulePublishPostData = task.taskData as unknown as SchedulePublishPostData;
    if (schedulePublishPostData.timestamp <= Date.now() + 10 * 60 * 1000) {
      return task;
    }
  }

  return null;
}

export async function authKey(request: Request) {
  const session = await auth();
  if (session?.user) {
    return {
      success: true,
      userId: session.user.id,
    };
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return {
      success: false,
      error: 'UNAUTHORIZED',
    };
  }
  const apiKey = authHeader.split(' ')[1];
  if (!apiKey) {
    return {
      success: false,
      error: 'UNAUTHORIZED',
    };
  }

  const key = await prisma.aPIKey.findUnique({
    where: {
      key: apiKey,
    },
    select: {
      userId: true,
    },
  });
  if (!key) {
    return {
      success: false,
      error: 'KEY_EXPIRED',
    };
  }

  return {
    success: true,
    userId: key.userId,
  };
}
