'use server';

import { multipostDb } from '@/lib/db';
import { startOfDay, subDays } from 'date-fns';
import { Users } from 'lucide-react';
import { Card, CardBody } from '@heroui/react';
import { Icon } from '@iconify/react';

async function getVisitorsStats(websiteId: string) {
  const now = new Date();
  const today = startOfDay(now);
  const yesterday = startOfDay(subDays(now, 1));

  // 获取今日实时访客数
  const todayVisitors = await multipostDb.visitorSession.count({
    where: {
      websiteId,
      createdAt: {
        gte: today,
      },
    },
  });

  // 获取昨日数据用于计算增长率
  const yesterdayVisitors = await multipostDb.visitorSession.count({
    where: {
      websiteId,
      createdAt: {
        gte: yesterday,
        lt: today,
      },
    },
  });

  return {
    current: todayVisitors,
    change: yesterdayVisitors ? ((todayVisitors - yesterdayVisitors) / yesterdayVisitors) * 100 : 0,
  };
}

interface VisitorsCardProps {
  websiteId: string;
}

export async function VisitorsCard({ websiteId }: VisitorsCardProps) {
  const stats = await getVisitorsStats(websiteId);

  return (
    <Card>
      <CardBody className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">实时访客</span>
          <div className="rounded-full bg-gray-100 p-2 dark:bg-gray-800">
            <Users className="size-4" />
          </div>
        </div>
        {stats.current === 0 ? (
          <div className="flex flex-col items-center justify-center space-y-2 py-2">
            <Icon
              icon="openmoji:smiling-face-with-open-hands"
              className="size-20"
            />
            <p className="text-sm text-gray-500">今日暂无访客</p>
          </div>
        ) : (
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-semibold">{stats.current.toString()}</span>
            <span className={`flex items-center text-sm ${stats.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {`${stats.change >= 0 ? '+' : ''}${stats.change.toFixed(1)}%`}
            </span>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
