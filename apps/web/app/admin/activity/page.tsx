/**
 * @file Admin activity page
 * @description Manage promotion tasks
 * @author harrywong
 * @date 2024-06-09
 */

import React from 'react';
import { multipostDb } from '@/lib/db';
import { ActivitiesList } from './components/ActivitiesList';
import type { ClientPromotionTask } from '@/app/api/promotion/types';
import { CreateActivityModal } from './components/CreateActivityModal';

async function getPromotionTasks(): Promise<ClientPromotionTask[]> {
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

  // 将 Decimal 转换为字符串
  return tasks.map((task) => ({
    ...task,
    reward: task.reward.toString(),
  }));
}

export default async function AdminActivityPage() {
  const tasks = await getPromotionTasks();

  return (
    <div className="flex w-full max-w-7xl flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">活动管理</h1>
        <CreateActivityModal />
      </div>
      <ActivitiesList tasks={tasks} />
    </div>
  );
}
