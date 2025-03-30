/**
 * @file 浏览器使用统计卡片
 */

'use server';

import { multipostDb } from '@/lib/db';
import { BROWSERS } from '@/lib/constants';
import { StatTable } from './StatTable';

async function getBrowserStats(websiteId: string, startDate: Date, endDate: Date, isDetail?: boolean) {
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
    take: isDetail ? undefined : 10,
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
  className?: string;
  isDetail?: boolean;
}

export async function BrowsersCard({ websiteId, startDate, endDate, className, isDetail }: BrowsersCardProps) {
  const stats = await getBrowserStats(websiteId, startDate, endDate, isDetail);

  return (
    <StatTable
      title="浏览器"
      items={stats}
      className={className}
      showMoreButton={!isDetail}
      detailType="browsers"
    />
  );
}
