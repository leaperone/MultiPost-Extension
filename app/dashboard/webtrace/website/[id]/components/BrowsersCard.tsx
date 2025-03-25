/**
 * @file 浏览器使用统计卡片
 */

'use server';

import { multipostDb } from '@/lib/db';
import { BROWSERS } from '@/lib/constants';
import { Card, CardBody, CardHeader } from '@heroui/react';

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
    take: 5,
  });

  const total = browsers.reduce((acc, curr) => acc + curr._count.browser, 0);

  return browsers.map((item) => ({
    name: BROWSERS[item.browser as keyof typeof BROWSERS] || item.browser || 'Unknown',
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">浏览器</h2>
        </div>
      </CardHeader>
      <CardBody>
        <div className="space-y-4">
          {stats.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-xs text-gray-500">{item.count.toLocaleString()} 访问</p>
              </div>
              <div className="text-sm text-gray-500">{item.percentage.toFixed(1)}%</div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
