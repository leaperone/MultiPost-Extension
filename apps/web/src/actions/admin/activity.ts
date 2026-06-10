import { createServerFn } from '@tanstack/react-start';
import { PromotionTask } from '@db/schema/schema';
import { desc } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../../lib/db';
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

    const tasks = await db
      .select({
        id: PromotionTask.id,
        userId: PromotionTask.userId,
        taskType: PromotionTask.taskType,
        title: PromotionTask.title,
        description: PromotionTask.description,
        link: PromotionTask.link,
        keywords: PromotionTask.keywords,
        examples: PromotionTask.examples,
        expiredAt: PromotionTask.expiredAt,
        createdAt: PromotionTask.createdAt,
        updatedAt: PromotionTask.updatedAt,
        reward: PromotionTask.reward,
      })
      .from(PromotionTask)
      .orderBy(desc(PromotionTask.createdAt));

    return tasks.map((task) => ({
      ...task,
      keywords: task.keywords ?? [],
      examples: task.examples ?? [],
      reward: task.reward.toString(),
      expiredAt: task.expiredAt.toISOString(),
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    }));
  });
