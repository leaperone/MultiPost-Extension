'use server';

import { multipostDb } from '@/lib/db';
import { StatTable } from './StatTable';

async function getPopularPages(websiteId: string, startDate: Date, endDate: Date) {
  const pages = await multipostDb.websiteEvent.groupBy({
    by: ['urlPath'],
    where: {
      websiteId,
      createdAt: {
        gte: startDate,
        lt: endDate,
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
    take: 10,
  });

  const totalPageviews = pages.reduce((acc, curr) => acc + curr._count.urlPath, 0);

  return pages.map((page) => ({
    key: page.urlPath || '/',
    label: page.urlPath || '/',
    count: page._count.urlPath,
    percentage: (page._count.urlPath / totalPageviews) * 100,
  }));
}

interface PopularPagesCardProps {
  websiteId: string;
  startDate: Date;
  endDate: Date;
}

export async function PopularPagesCard({ websiteId, startDate, endDate }: PopularPagesCardProps) {
  const stats = await getPopularPages(websiteId, startDate, endDate);

  return (
    <StatTable
      title="热门页面"
      items={stats}
    />
  );
}
