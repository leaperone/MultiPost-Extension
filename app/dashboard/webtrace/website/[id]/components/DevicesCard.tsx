/**
 * @file 设备使用统计卡片
 */

'use server';

import { multipostDb } from '@/lib/db';
import { Card, CardBody, CardHeader } from '@heroui/react';

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
    take: 5,
  });

  const total = devices.reduce((acc, curr) => acc + curr._count.device, 0);

  return devices.map((item) => ({
    name: item.device || 'Unknown',
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">设备类型</h2>
        </div>
      </CardHeader>
      <CardBody>
        <div className="space-y-4">
          {stats.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">{item.name.charAt(0).toUpperCase() + item.name.slice(1)}</p>
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
