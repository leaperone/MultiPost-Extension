/**
 * @file 浏览器使用统计卡片
 */

'use server';

import { multipostDb } from '@/lib/db';
import { BROWSERS } from '@/lib/constants';
import { StatTable } from './StatTable';

async function getBrowserStats(websiteId: string, startDate: Date, endDate: Date) {
  const browsers = await multipostDb.visitorSession.groupBy({
    by: ['browser'],
    where: {
      websiteId,
      createdAt: {
        gte: startDate,
        lt: endDate,
      },
      browser: {
        not: null,
      },
    },
    _count: {
      browser: true,
    },
    orderBy: {
      _count: {
        browser: 'desc',
      },
    },
    take: 10,
  });

  const total = browsers.reduce((acc, curr) => acc + curr._count.browser, 0);

  return browsers.map((item) => ({
    key: item.browser || 'unknown',
    label: BROWSERS[item.browser as keyof typeof BROWSERS] || item.browser || 'Unknown',
    count: item._count.browser,
    percentage: (item._count.browser / total) * 100,
  }));
}

interface BrowsersCardProps {
  websiteId: string;
  startDate: Date;
  endDate: Date;
}

export async function BrowsersCard({ websiteId, startDate, endDate }: BrowsersCardProps) {
  const stats = await getBrowserStats(websiteId, startDate, endDate);

  return (
    <StatTable
      title="浏览器"
      items={stats}
    />
  );
}
