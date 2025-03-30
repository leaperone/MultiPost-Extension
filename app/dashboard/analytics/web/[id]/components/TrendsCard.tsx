'use server';

import { multipostDb } from '@/lib/db';
import { VisitTrendsChart } from './VisitTrendsChart';
import { differenceInDays, differenceInHours, addDays, addHours, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

type TimeGranularity = 'hour' | 'day' | 'month';

async function getVisitTrends(websiteId: string, startDate: Date, endDate: Date, timezone: string) {
  // 计算时间范围
  const daysDiff = differenceInDays(endDate, startDate);
  const hoursDiff = differenceInHours(endDate, startDate);

  // 确定时间粒度: 小于48小时按小时, 小于90天按天, 否则按月
  const granularity: TimeGranularity = hoursDiff < 48 ? 'hour' : daysDiff < 90 ? 'day' : 'month';

  // 按照不同粒度准备数据
  if (granularity === 'hour') {
    // 按小时获取和准备数据
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

    // 小时数量
    const hours = hoursDiff + 1;

    // 生成小时数组
    const dateArray = Array.from({ length: hours }, (_, i) => {
      const date = addHours(startDate, i);
      return {
        date: formatInTimeZone(date, timezone, 'yyyy-MM-dd HH:00'),
        displayDate: formatInTimeZone(date, timezone, 'yyyy-MM-dd HH:00'),
        views: 0,
        granularity,
      };
    });

    // 按小时合并数据
    const hourlyViews = events.reduce(
      (acc, event) => {
        const dateStr = formatInTimeZone(event.createdAt, timezone, 'yyyy-MM-dd HH:00');
        acc[dateStr] = (acc[dateStr] || 0) + event._count._all;
        return acc;
      },
      {} as Record<string, number>,
    );

    // 更新小时数组中的访问量
    dateArray.forEach((item) => {
      if (hourlyViews[item.date]) {
        item.views = hourlyViews[item.date];
      }
    });

    return dateArray;
  } else if (granularity === 'day') {
    // 按天获取和准备数据
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

    // 天数
    const days = daysDiff + 1;

    // 生成日期数组
    const dateArray = Array.from({ length: days }, (_, i) => {
      const date = addDays(startDate, i);
      return {
        date: formatInTimeZone(date, timezone, 'yyyy-MM-dd'),
        displayDate: formatInTimeZone(date, timezone, 'yyyy-MM-dd'),
        views: 0,
        granularity,
      };
    });

    // 按天合并数据
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
  } else {
    // 按月获取和准备数据
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

    // 计算月份范围
    const startMonth = startOfMonth(startDate);
    const endMonth = endOfMonth(endDate);
    const monthsDiff = Math.floor(differenceInDays(endMonth, startMonth) / 30) + 1;

    // 生成月份数组
    const dateArray = Array.from({ length: monthsDiff }, (_, i) => {
      const date = addMonths(startMonth, i);
      return {
        date: formatInTimeZone(date, timezone, 'yyyy-MM'),
        displayDate: formatInTimeZone(date, timezone, 'yyyy-MM'),
        views: 0,
        granularity,
      };
    });

    // 按月合并数据
    const monthlyViews = events.reduce(
      (acc, event) => {
        const dateStr = formatInTimeZone(event.createdAt, timezone, 'yyyy-MM');
        acc[dateStr] = (acc[dateStr] || 0) + event._count._all;
        return acc;
      },
      {} as Record<string, number>,
    );

    // 更新月份数组中的访问量
    dateArray.forEach((item) => {
      if (monthlyViews[item.date]) {
        item.views = monthlyViews[item.date];
      }
    });

    return dateArray;
  }
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
