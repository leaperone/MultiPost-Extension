/**
 * @file 主机名统计卡片
 */

'use server';

import { multipostDb } from '@/lib/db';
import { StatTable } from './StatTable';

async function getHostStats(websiteId: string, startDate: Date, endDate: Date, isDetail?: boolean) {
  const hosts = await multipostDb.visitorSession.groupBy({
    by: ['hostname'],
    where: {
      websiteId,
      createdAt: {
        gte: startDate,
        lt: endDate,
      },
      hostname: {
        not: null,
      },
    },
    _count: {
      hostname: true,
    },
    orderBy: {
      _count: {
        hostname: 'desc',
      },
    },
    take: isDetail ? undefined : 10,
  });

  const total = hosts.reduce((acc, curr) => acc + curr._count.hostname, 0);

  return hosts.map((item) => ({
    key: item.hostname || 'unknown',
    label: item.hostname || 'Unknown',
    count: item._count.hostname,
    percentage: (item._count.hostname / total) * 100,
  }));
}

interface HostsCardProps {
  websiteId: string;
  startDate: Date;
  endDate: Date;
  className?: string;
  isDetail?: boolean;
}

export async function HostsCard({ websiteId, startDate, endDate, className, isDetail }: HostsCardProps) {
  const stats = await getHostStats(websiteId, startDate, endDate, isDetail);

  return (
    <StatTable
      title="主机名"
      items={stats}
      className={className}
      showMoreButton={!isDetail}
      detailType="hosts"
    />
  );
}
