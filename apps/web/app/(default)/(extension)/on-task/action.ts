'use server';

import { prisma } from '@/lib/db';

export async function getTaskData(taskId: string) {
  try {
    const task = await prisma.extensionTask.findUnique({
      where: {
        id: taskId,
      },
      select: {
        id: true,
        taskType: true,
        taskData: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return task;
  } catch (error) {
    console.error('Error fetching task data:', error);
    throw new Error('Failed to fetch task data');
  }
}

export async function updateTaskStatus(taskId: string, status: string) {
  try {
    await prisma.extensionTask.update({
      where: { id: taskId },
      data: { status },
    });
  } catch (error) {
    console.error('Error updating task status:', error);
    throw new Error('Failed to update task status');
  }
}

export async function getDraftData(draftId: string) {
  try {
    const draft = await prisma.draft.findUnique({
      where: { id: draftId },
    });
    return draft;
  } catch (error) {
    console.error('Error fetching draft data:', error);
    throw new Error('Failed to fetch draft data');
  }
}
