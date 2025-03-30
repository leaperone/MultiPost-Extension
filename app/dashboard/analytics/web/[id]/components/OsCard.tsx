/**
 * @file 操作系统使用统计卡片
 */

'use server';

import { multipostDb } from '@/lib/db';
import { StatTable } from './StatTable';

async function getOsStats(websiteId: string, startDate: Date, endDate: Date, isDetail?: boolean) {
  const oses = await multipostDb.visitorSession.groupBy({
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
    take: isDetail ? undefined : 10,
  });

  const total = oses.reduce((acc, curr) => acc + curr._count.os, 0);

  return oses.map((item) => ({
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
  className?: string;
  isDetail?: boolean;
}

export async function OsCard({ websiteId, startDate, endDate, className, isDetail }: OsCardProps) {
  const stats = await getOsStats(websiteId, startDate, endDate, isDetail);

  return (
    <StatTable
      title="操作系统"
      items={stats}
      className={className}
      showMoreButton={!isDetail}
      detailType="os"
    />
  );
}
