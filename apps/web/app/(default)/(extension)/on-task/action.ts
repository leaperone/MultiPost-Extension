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

/**
 * Atomically claims a pending task by flipping its status PENDING -> ACTIVE.
 * Only the single caller that performs the transition gets `true`; concurrent
 * callers (e.g. an effect that re-ran, or another page) get `false` and must
 * not proceed with publishing. This is the server-side guard against the
 * same task being published more than once.
 */
export async function claimTask(taskId: string): Promise<boolean> {
  try {
    const result = await prisma.extensionTask.updateMany({
      where: { id: taskId, status: 'PENDING' },
      data: { status: 'ACTIVE' },
    });
    return result.count === 1;
  } catch (error) {
    console.error('Error claiming task:', error);
    return false;
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
