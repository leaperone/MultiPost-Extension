'use server';

import { multipostDb } from '@/lib/db';
import { Card, CardBody, CardHeader } from '@heroui/react';

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
    take: 5,
  });

  return pages.map((page) => ({
    urlPath: page.urlPath,
    count: page._count.urlPath,
  }));
}

interface PopularPagesCardProps {
  websiteId: string;
  startDate: Date;
  endDate: Date;
}

export async function PopularPagesCard({ websiteId, startDate, endDate }: PopularPagesCardProps) {
  const popularPages = await getPopularPages(websiteId, startDate, endDate);
  const totalPageviews = popularPages.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">热门页面</h2>
      </CardHeader>
      <CardBody>
        <div className="space-y-4">
          {popularPages.map((page) => (
            <div
              key={page.urlPath}
              className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{page.urlPath}</p>
                  <p className="text-xs text-gray-500">{page.count.toLocaleString()} 访问</p>
                </div>
              </div>
              <div className="text-sm text-gray-500">{((page.count / totalPageviews) * 100).toFixed(1)}%</div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
