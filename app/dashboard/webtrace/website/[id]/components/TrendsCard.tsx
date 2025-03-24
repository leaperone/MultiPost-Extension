'use server';

import { multipostDb } from '@/lib/db';
import { endOfDay, startOfDay } from 'date-fns';
import { VisitTrendsChart } from './VisitTrendsChart';

async function getVisitTrends(websiteId: string, startDate: Date, endDate: Date) {
  // 获取访问趋势数据，按天分组
  const events = await multipostDb.websiteEvent.groupBy({
    by: ['createdAt'],
    where: {
      websiteId,
      createdAt: {
        gte: startOfDay(startDate),
        lte: endOfDay(endDate),
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

  // 计算天数
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  // 生成日期数组，初始化所有日期的访问量为 0
  const dateArray = Array.from({ length: days }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
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
  startDate: Date;
  endDate: Date;
}

export async function TrendsCard({ websiteId, startDate, endDate }: TrendsCardProps) {
  const trends = await getVisitTrends(websiteId, startDate, endDate);

  return <VisitTrendsChart data={trends} />;
}
