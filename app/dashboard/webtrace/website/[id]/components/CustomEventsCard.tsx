/**
 * @file 自定义事件数量排名卡片组件
 */

import { Card, CardHeader, CardBody } from '@heroui/react';
import { multipostDb } from '@/lib/db';
import { cn } from '@/lib/utils';

/**
 * 获取自定义事件排名
 */
async function getCustomEvents(websiteId: string, startDate: Date, endDate: Date) {
  const events = await multipostDb.websiteEvent.groupBy({
    by: ['eventName'],
    where: {
      websiteId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      eventType: 2,
      eventName: {
        not: null,
      },
    },
    _count: true,
    orderBy: {
      eventName: 'desc',
    },
    take: 10,
  });

  return events.map((event) => ({
    name: event.eventName as string,
    count: event._count,
  }));
}

interface CustomEventsCardProps {
  websiteId: string;
  startDate: Date;
  endDate: Date;
  className?: string;
}

export async function CustomEventsCard({ websiteId, startDate, endDate, className }: CustomEventsCardProps) {
  const events = await getCustomEvents(websiteId, startDate, endDate);

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <h3 className="text-lg font-semibold">自定义事件排名</h3>
      </CardHeader>
      <CardBody>
        {events.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-sm text-gray-500">暂无数据</div>
        ) : (
          <div className="space-y-4">
            {events.map((event, index) => (
              <div
                key={event.name}
                className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                  <span className="text-sm font-medium">{event.name}</span>
                </div>
                <span className="text-sm text-gray-500">{event.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
