/**
 * @file 访问来源统计卡片
 */

'use server';

import { multipostDb } from '@/lib/db';
import { Card, CardBody, CardHeader } from '@heroui/react';
import { Link } from 'lucide-react';

async function getReferrerStats(websiteId: string, startDate: Date, endDate: Date) {
  const referrers = await multipostDb.websiteEvent.groupBy({
    by: ['referrerDomain'],
    where: {
      websiteId,
      createdAt: {
        gte: startDate,
        lt: endDate,
      },
      referrerDomain: {
        not: null,
      },
    },
    _count: {
      referrerDomain: true,
    },
    orderBy: {
      _count: {
        referrerDomain: 'desc',
      },
    },
    take: 5,
  });

  const directVisits = await multipostDb.websiteEvent.count({
    where: {
      websiteId,
      createdAt: {
        gte: startDate,
        lt: endDate,
      },
      referrerDomain: null,
    },
  });

  // 计算总访问量（包括直接访问）
  const total = referrers.reduce((acc, curr) => acc + curr._count.referrerDomain, 0) + directVisits;

  // 转换数据格式
  const stats = [
    // 添加直接访问数据
    {
      name: '直接访问',
      count: directVisits,
      percentage: (directVisits / total) * 100,
    },
    // 添加来源域名数据
    ...referrers.map((item) => ({
      name: item.referrerDomain || 'Unknown',
      count: item._count.referrerDomain,
      percentage: (item._count.referrerDomain / total) * 100,
    })),
  ];

  // 按访问量排序
  return stats.sort((a, b) => b.count - a.count);
}

interface ReferrersCardProps {
  websiteId: string;
  startDate: Date;
  endDate: Date;
}

export async function ReferrersCard({ websiteId, startDate, endDate }: ReferrersCardProps) {
  const stats = await getReferrerStats(websiteId, startDate, endDate);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">访问来源</h2>
          <div className="rounded-full bg-gray-100 p-2 dark:bg-gray-800">
            <Link className="size-4" />
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
