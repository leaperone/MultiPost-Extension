/**
 * @file 自定义事件数量排名卡片组件
 */

import { multipostDb } from '@/lib/db';
import { StatTable } from './StatTable';

/**
 * 获取自定义事件排名
 */
async function getCustomEvents(websiteId: string, startDate: Date, endDate: Date, isDetail?: boolean) {
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
    _count: {
      eventName: true,
    },
    orderBy: {
      _count: {
        eventName: 'desc',
      },
    },
    // 如果是详情视图，则获取所有数据，否则只获取前10条
    take: isDetail ? undefined : 10,
  });

  const total = events.reduce((acc, curr) => acc + curr._count.eventName, 0);

  return events.map((event) => ({
    key: event.eventName || 'unknown',
    label: event.eventName,
    count: event._count.eventName,
    percentage: (event._count.eventName / total) * 100,
  }));
}

interface CustomEventsCardProps {
  websiteId: string;
  startDate: Date;
  endDate: Date;
  className?: string;
  isDetail?: boolean;
}

export async function CustomEventsCard({ websiteId, startDate, endDate, className, isDetail }: CustomEventsCardProps) {
  const events = await getCustomEvents(websiteId, startDate, endDate, isDetail);

  return (
    <StatTable
      title="自定义事件"
      items={events}
      className={className}
      emptyText="暂无数据"
      showMoreButton={!isDetail}
      detailType="events"
    />
  );
}
