/**
 * @file 操作系统使用统计卡片
 */

'use server';

import { multipostDb } from '@/lib/db';
import { StatTable } from './StatTable';

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
    take: 10,
  });

  const total = systems.reduce((acc, curr) => acc + curr._count.os, 0);

  return systems.map((item) => ({
    key: item.os || 'unknown',
    label: item.os || 'Unknown',
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
    <StatTable
      title="操作系统"
      items={stats}
    />
  );
}
