'use server';

import { multipostDb } from '@/lib/db';
import { StatTable } from './StatTable';

async function getPopularPages(websiteId: string, startDate: Date, endDate: Date, isDetail?: boolean) {
  const website = await multipostDb.website.findUnique({
    where: { id: websiteId },
    select: { domain: true },
  });

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
    take: isDetail ? undefined : 10,
  });

  const totalPageviews = pages.reduce((acc, curr) => acc + curr._count.urlPath, 0);

  return pages.map((page) => ({
    key: page.urlPath || '/',
    label: page.urlPath || '/',
    count: page._count.urlPath,
    percentage: (page._count.urlPath / totalPageviews) * 100,
    href: `https://${website?.domain}${page.urlPath || '/'}`,
  }));
}

interface PopularPagesCardProps {
  websiteId: string;
  startDate: Date;
  endDate: Date;
  className?: string;
  isDetail?: boolean;
}

export async function PopularPagesCard({ websiteId, startDate, endDate, className, isDetail }: PopularPagesCardProps) {
  const stats = await getPopularPages(websiteId, startDate, endDate, isDetail);

  return (
    <StatTable
      title="热门页面"
      items={stats}
      className={className}
      showMoreButton={!isDetail}
      detailType="pages"
    />
  );
}
