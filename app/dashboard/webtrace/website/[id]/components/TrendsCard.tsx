'use server';

import { multipostDb } from '@/lib/db';
import { endOfDay, startOfDay, subDays } from 'date-fns';
import { VisitTrendsChart } from './VisitTrendsChart';

async function getVisitTrends(websiteId: string, days: number = 7) {
  const now = new Date();
  const startDate = startOfDay(subDays(now, days - 1));
  const endDate = endOfDay(now);

  // 获取访问趋势数据，按天分组
  const events = await multipostDb.websiteEvent.groupBy({
    by: ['createdAt'],
    where: {
      websiteId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      eventType: 1,
    },
    _count: {
      _all: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  // 生成日期数组，初始化所有日期的访问量为 0
  const dateArray = Array.from({ length: days }, (_, i) => {
    const date = startOfDay(subDays(now, days - 1 - i));
    return {
      date: date.toISOString().split('T')[0],
      views: 0,
    };
  });

  // 按天合并数据
  const dailyViews = events.reduce(
    (acc, event) => {
      const dateStr = event.createdAt.toISOString().split('T')[0];
      acc[dateStr] = (acc[dateStr] || 0) + event._count._all;
      return acc;
    },
    {} as Record<string, number>,
  );

  // 更新日期数组中的访问量
  dateArray.forEach((item) => {
    if (dailyViews[item.date]) {
      item.views = dailyViews[item.date];
    }
  });

  return dateArray;
}

interface TrendsCardProps {
  websiteId: string;
}

export async function TrendsCard({ websiteId }: TrendsCardProps) {
  const trends = await getVisitTrends(websiteId);

  return <VisitTrendsChart data={trends} />;
}
