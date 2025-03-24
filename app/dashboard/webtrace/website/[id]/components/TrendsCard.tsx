'use server';

import { multipostDb } from '@/lib/db';
import { VisitTrendsChart } from './VisitTrendsChart';
import { differenceInDays, addDays } from 'date-fns';

function getLocalDayRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  return { start, end };
}

async function getVisitTrends(websiteId: string, startDate: Date, endDate: Date) {
  const { start: localStart } = getLocalDayRange(startDate);
  const { end: localEnd } = getLocalDayRange(endDate);

  // 获取访问趋势数据，按天分组（使用本地时间）
  const events = await multipostDb.websiteEvent.groupBy({
    by: ['createdAt'],
    where: {
      websiteId,
      createdAt: {
        gte: localStart,
        lte: localEnd,
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

  // 计算天数（包含开始和结束日期）
  const days = differenceInDays(endDate, startDate) + 1;

  // 生成日期数组，使用本地时间
  const dateArray = Array.from({ length: days }, (_, i) => {
    const date = addDays(startDate, i);
    return {
      date: new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString().split('T')[0],
      views: 0,
    };
  });

  // 按天合并数据（使用本地时间）
  const dailyViews = events.reduce(
    (acc, event) => {
      const localDate = new Date(event.createdAt);
      const dateStr = new Date(localDate.getFullYear(), localDate.getMonth(), localDate.getDate())
        .toISOString()
        .split('T')[0];
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
