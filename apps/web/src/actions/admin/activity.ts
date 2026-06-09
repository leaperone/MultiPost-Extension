import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { multipostDb } from '../../lib/db';
import { getSession } from '../../lib/session';
import { isAdmin } from '../admin';
import type { ClientPromotionTask } from '../activity';

const emptySchema = z.object({});

async function requireAdmin() {
  const session = await getSession();
  if (!session?.user?.id || !session.user.email) return null;
  if (!isAdmin(session.user.email)) return null;
  return session;
}

export const getAdminPromotionTasks = createServerFn({ method: 'GET' })
  .validator(emptySchema)
  .handler(async (): Promise<ClientPromotionTask[]> => {
    const session = await requireAdmin();
    if (!session) return [];

    const tasks = await multipostDb.promotionTask.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        userId: true,
        taskType: true,
        title: true,
        description: true,
        link: true,
        keywords: true,
        examples: true,
        expiredAt: true,
        createdAt: true,
        updatedAt: true,
        reward: true,
      },
    });

    return tasks.map((task) => ({
      ...task,
      reward: task.reward.toString(),
      expiredAt: task.expiredAt.toISOString(),
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    }));
  });
