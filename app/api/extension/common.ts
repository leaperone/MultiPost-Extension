'use server';

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
