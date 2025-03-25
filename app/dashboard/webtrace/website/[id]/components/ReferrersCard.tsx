/**
 * @file 访问来源统计卡片
 */

'use server';

import { multipostDb } from '@/lib/db';
import { Card, CardBody, CardHeader, Image } from '@heroui/react';

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

  // 计算总访问量（不包括直接访问）
  const total = referrers.reduce((acc, curr) => acc + curr._count.referrerDomain, 0);

  // 转换数据格式，不包含直接访问
  const stats = referrers.map((item) => ({
    name: item.referrerDomain || 'Unknown',
    count: item._count.referrerDomain,
    percentage: (item._count.referrerDomain / total) * 100,
    favicon: `https://icons.duckduckgo.com/ip3/${item.referrerDomain}.ico`,
  }));

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
        </div>
      </CardHeader>
      <CardBody>
        <div className="space-y-4">
          {stats.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Image
                  src={item.favicon}
                  alt={`${item.name} favicon`}
                  width={16}
                  height={16}
                  className="rounded-sm"
                />
                <div className="space-y-1">
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.count.toLocaleString()} 访问</p>
                </div>
              </div>
              <div className="text-sm text-gray-500">{item.percentage.toFixed(1)}%</div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
