'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function deleteTask(taskId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Not authenticated');
  }

  const task = await prisma.extensionTask.findFirst({
    where: {
      id: taskId,
      userId: session.user.id,
    },
  });

  if (!task) {
    throw new Error('Task not found or you do not have permission to delete it.');
  }

  await prisma.extensionTask.delete({
    where: {
      id: taskId,
    },
  });

  revalidatePath(`/dashboard/settings/client/${task.targetClientId}`);
}

export async function deleteBatchTasks(taskIds: string[]) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Not authenticated');
  }

  if (taskIds.length === 0) {
    return;
  }

  // First verify all tasks belong to the user
  const tasks = await prisma.extensionTask.findMany({
    where: {
      id: {
        in: taskIds,
      },
      userId: session.user.id,
    },
    select: {
      id: true,
      targetClientId: true,
    },
  });

  if (tasks.length !== taskIds.length) {
    throw new Error('Some tasks not found or you do not have permission to delete them.');
  }

  // Delete all tasks
  await prisma.extensionTask.deleteMany({
    where: {
      id: {
        in: taskIds,
      },
      userId: session.user.id,
    },
  });

  // Get unique client IDs for revalidation
  const clientIds = [...new Set(tasks.map(task => task.targetClientId))];
  
  // Revalidate all affected client pages
  for (const clientId of clientIds) {
    revalidatePath(`/dashboard/settings/client/${clientId}`);
  }
}