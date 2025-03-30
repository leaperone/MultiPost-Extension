/**
 * @file 页面标题统计卡片
 */

'use server';

import { multipostDb } from '@/lib/db';
import { StatTable } from './StatTable';

async function getPageTitleStats(websiteId: string, startDate: Date, endDate: Date, isDetail?: boolean) {
  const pageTitles = await multipostDb.websiteEvent.groupBy({
    by: ['pageTitle'],
    where: {
      websiteId,
      createdAt: {
        gte: startDate,
        lt: endDate,
      },
      pageTitle: {
        not: null,
      },
    },
    _count: {
      pageTitle: true,
    },
    orderBy: {
      _count: {
        pageTitle: 'desc',
      },
    },
    take: isDetail ? undefined : 10,
  });

  const total = pageTitles.reduce((acc, curr) => acc + curr._count.pageTitle, 0);

  return pageTitles.map((item) => ({
    key: item.pageTitle || 'unknown',
    label: item.pageTitle || 'Unknown',
    count: item._count.pageTitle,
    percentage: (item._count.pageTitle / total) * 100,
  }));
}

interface PageTitlesCardProps {
  websiteId: string;
  startDate: Date;
  endDate: Date;
  className?: string;
  isDetail?: boolean;
}

export async function PageTitlesCard({ websiteId, startDate, endDate, className, isDetail }: PageTitlesCardProps) {
  const stats = await getPageTitleStats(websiteId, startDate, endDate, isDetail);

  return (
    <StatTable
      title="页面标题"
      items={stats}
      className={className}
      showMoreButton={!isDetail}
      detailType="pagetitles"
    />
  );
}
