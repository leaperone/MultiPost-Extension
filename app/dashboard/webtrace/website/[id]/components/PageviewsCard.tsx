'use server';

import { multipostDb } from '@/lib/db';
import { startOfDay, subDays } from 'date-fns';
import { Eye } from 'lucide-react';
import { Card, CardBody } from '@heroui/react';
import { Icon } from '@iconify/react';

async function getPageviewsStats(websiteId: string) {
  const now = new Date();
  const today = startOfDay(now);
  const yesterday = startOfDay(subDays(now, 1));

  // 获取今日浏览量
  const todayPageviews = await multipostDb.websiteEvent.count({
    where: {
      websiteId,
      createdAt: {
        gte: today,
      },
      eventType: 1, // 页面浏览
    },
  });

  // 获取昨日数据用于计算增长率
  const yesterdayPageviews = await multipostDb.websiteEvent.count({
    where: {
      websiteId,
      createdAt: {
        gte: yesterday,
        lt: today,
      },
      eventType: 1,
    },
  });

  return {
    current: todayPageviews,
    change: yesterdayPageviews ? ((todayPageviews - yesterdayPageviews) / yesterdayPageviews) * 100 : 0,
  };
}

interface PageviewsCardProps {
  websiteId: string;
}

export async function PageviewsCard({ websiteId }: PageviewsCardProps) {
  const stats = await getPageviewsStats(websiteId);

  return (
    <Card>
      <CardBody className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">今日浏览量</span>
          <div className="rounded-full bg-gray-100 p-2 dark:bg-gray-800">
            <Eye className="size-4" />
          </div>
        </div>
        {stats.current === 0 ? (
          <div className="flex flex-col items-center justify-center space-y-2 py-2">
            <Icon
              icon="openmoji:1f6a3-200d-2642"
              className="size-20"
            />
            <p className="text-sm text-gray-500">今日暂无浏览</p>
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
