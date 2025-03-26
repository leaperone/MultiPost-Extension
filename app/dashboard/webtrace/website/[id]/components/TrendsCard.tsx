'use server';

import { multipostDb } from '@/lib/db';
import { VisitTrendsChart } from './VisitTrendsChart';
import { differenceInDays, addDays } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

async function getVisitTrends(websiteId: string, startDate: Date, endDate: Date, timezone: string) {
  // 获取访问趋势数据，按天分组（使用指定的时区）
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

  // 计算天数（包含开始和结束日期）
  const days = differenceInDays(endDate, startDate) + 1;

  // 生成日期数组，使用指定的时区
  const dateArray = Array.from({ length: days }, (_, i) => {
    const date = addDays(startDate, i);
    return {
      date: formatInTimeZone(date, timezone, 'yyyy-MM-dd'),
      views: 0,
    };
  });

  // 按天合并数据（使用指定的时区）
  const dailyViews = events.reduce(
    (acc, event) => {
      const dateStr = formatInTimeZone(event.createdAt, timezone, 'yyyy-MM-dd');
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
  timezone: string;
}

export async function TrendsCard({ websiteId, startDate, endDate, timezone }: TrendsCardProps) {
  const trends = await getVisitTrends(websiteId, startDate, endDate, timezone);
  return <VisitTrendsChart data={trends} />;
}
