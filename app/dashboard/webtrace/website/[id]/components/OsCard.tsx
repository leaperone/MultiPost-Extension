/**
 * @file 操作系统使用统计卡片
 */

'use server';

import { multipostDb } from '@/lib/db';
import { Card, CardBody, CardHeader } from '@heroui/react';
import { Monitor } from 'lucide-react';

async function getOsStats(websiteId: string, startDate: Date, endDate: Date) {
  const systems = await multipostDb.visitorSession.groupBy({
    by: ['os'],
    where: {
      websiteId,
      createdAt: {
        gte: startDate,
        lt: endDate,
      },
      os: {
        not: null,
      },
    },
    _count: {
      os: true,
    },
    orderBy: {
      _count: {
        os: 'desc',
      },
    },
    take: 5,
  });

  const total = systems.reduce((acc, curr) => acc + curr._count.os, 0);

  return systems.map((item) => ({
    name: item.os || 'Unknown',
    count: item._count.os,
    percentage: (item._count.os / total) * 100,
  }));
}

interface OsCardProps {
  websiteId: string;
  startDate: Date;
  endDate: Date;
}

export async function OsCard({ websiteId, startDate, endDate }: OsCardProps) {
  const stats = await getOsStats(websiteId, startDate, endDate);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">操作系统</h2>
          <div className="rounded-full bg-gray-100 p-2 dark:bg-gray-800">
            <Monitor className="size-4" />
          </div>
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
