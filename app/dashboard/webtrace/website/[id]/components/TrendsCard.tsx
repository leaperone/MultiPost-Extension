'use server';

import { multipostDb } from '@/lib/db';
import { VisitTrendsChart } from './VisitTrendsChart';
import { differenceInDays, addDays } from 'date-fns';

function getUTCDayRange(date: Date) {
  const utcDate = new Date(date);
  const start = new Date(Date.UTC(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(
    Date.UTC(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate(), 23, 59, 59, 999),
  );
  return { start, end };
}

async function getVisitTrends(websiteId: string, startDate: Date, endDate: Date) {
  const { start: utcStart } = getUTCDayRange(startDate);
  const { end: utcEnd } = getUTCDayRange(endDate);

  // 获取访问趋势数据，按天分组（使用 UTC 时间）
  const events = await multipostDb.websiteEvent.groupBy({
    by: ['createdAt'],
    where: {
      websiteId,
      createdAt: {
        gte: utcStart,
        lte: utcEnd,
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

  // 生成日期数组，使用 UTC 时间
  const dateArray = Array.from({ length: days }, (_, i) => {
    const date = addDays(startDate, i);
    // 确保使用 UTC 日期
    return {
      date: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
        .toISOString()
        .split('T')[0],
      views: 0,
    };
  });

  // 按天合并数据（使用 UTC 时间）
  const dailyViews = events.reduce(
    (acc, event) => {
      // 确保使用 UTC 时间进行分组
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
