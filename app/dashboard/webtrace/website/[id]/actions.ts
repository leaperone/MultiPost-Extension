'use server';

import { multipostDb } from '@/lib/db';
import { endOfDay, startOfDay, subDays } from 'date-fns';

export async function getWebsiteStats(websiteId: string) {
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
  const yesterdayVisitors = await multipostDb.visitorSession.count({
    where: {
      websiteId,
      createdAt: {
        gte: yesterday,
        lt: today,
      },
    },
  });

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
    visitors: {
      current: todayVisitors,
      change: yesterdayVisitors ? ((todayVisitors - yesterdayVisitors) / yesterdayVisitors) * 100 : 0,
    },
    pageviews: {
      current: todayPageviews,
      change: yesterdayPageviews ? ((todayPageviews - yesterdayPageviews) / yesterdayPageviews) * 100 : 0,
    },
  };
}

export async function getVisitTrends(websiteId: string, days: number = 7) {
  const now = new Date();
  const startDate = startOfDay(subDays(now, days - 1));
  const endDate = endOfDay(now);

  // 获取访问趋势数据
  const events = await multipostDb.websiteEvent.groupBy({
    by: ['websiteId', 'createdAt'],
    where: {
      websiteId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      eventType: 1,
    },
    _count: true,
    orderBy: {
      createdAt: 'asc',
    },
  });

  // 生成日期数组
  const dateArray = Array.from({ length: days }, (_, i) => {
    const date = startOfDay(subDays(now, days - 1 - i));
    return {
      date: date.toISOString().split('T')[0],
      views: 0,
    };
  });

  // 合并数据
  events.forEach((event) => {
    const dateStr = event.createdAt.toISOString().split('T')[0];
    const dateItem = dateArray.find((item) => item.date === dateStr);
    if (dateItem) {
      dateItem.views = event._count;
    }
  });

  return dateArray;
}

export async function getPopularPages(websiteId: string) {
  const startDate = startOfDay(subDays(new Date(), 7));

  const pages = await multipostDb.websiteEvent.groupBy({
    by: ['urlPath'],
    where: {
      websiteId,
      createdAt: {
        gte: startDate,
      },
      eventType: 1,
    },
    _count: {
      urlPath: true,
    },
    orderBy: {
      _count: {
        urlPath: 'desc',
      },
    },
    take: 5,
  });

  return pages.map((page) => ({
    urlPath: page.urlPath,
    count: page._count.urlPath,
  }));
}
