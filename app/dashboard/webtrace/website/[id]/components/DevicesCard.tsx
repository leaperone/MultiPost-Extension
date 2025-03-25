/**
 * @file 设备使用统计卡片
 */

'use server';

import { multipostDb } from '@/lib/db';
import { StatTable } from './StatTable';

async function getDeviceStats(websiteId: string, startDate: Date, endDate: Date) {
  const devices = await multipostDb.visitorSession.groupBy({
    by: ['device'],
    where: {
      websiteId,
      createdAt: {
        gte: startDate,
        lt: endDate,
      },
      device: {
        not: null,
      },
    },
    _count: {
      device: true,
    },
    orderBy: {
      _count: {
        device: 'desc',
      },
    },
    take: 10,
  });

  const total = devices.reduce((acc, curr) => acc + curr._count.device, 0);

  return devices.map((item) => ({
    key: item.device || 'unknown',
    label: item.device ? item.device.charAt(0).toUpperCase() + item.device.slice(1) : 'Unknown',
    count: item._count.device,
    percentage: (item._count.device / total) * 100,
  }));
}

interface DevicesCardProps {
  websiteId: string;
  startDate: Date;
  endDate: Date;
}

export async function DevicesCard({ websiteId, startDate, endDate }: DevicesCardProps) {
  const stats = await getDeviceStats(websiteId, startDate, endDate);

  return (
    <StatTable
      title="设备类型"
      items={stats}
    />
  );
}
