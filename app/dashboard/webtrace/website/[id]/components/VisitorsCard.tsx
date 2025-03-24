'use server';

import { multipostDb } from '@/lib/db';
import { Users } from 'lucide-react';
import { Card, CardBody } from '@heroui/react';
import { Icon } from '@iconify/react';

async function getVisitorsStats(websiteId: string, startDate: Date, endDate: Date) {
  // 获取当前周期访客数（通过独立的 visitId 计算）
  const currentCycleVisitors = await multipostDb.websiteEvent.findMany({
    where: {
      websiteId,
      createdAt: {
        gte: startDate,
        lt: endDate,
      },
    },
    distinct: ['visitId'],
  });

  // 计算上一周期的时间范围
  const timeSpan = endDate.getTime() - startDate.getTime();
  const previousCycleStart = new Date(startDate.getTime() - timeSpan);
  const previousCycleEnd = startDate;

  // 获取上一周期数据用于计算增长率（通过独立的 visitId 计算）
  const previousCycleVisitors = await multipostDb.websiteEvent.findMany({
    where: {
      websiteId,
      createdAt: {
        gte: previousCycleStart,
        lt: previousCycleEnd,
      },
    },
    distinct: ['visitId'],
  });

  return {
    current: currentCycleVisitors.length,
    change: previousCycleVisitors.length
      ? ((currentCycleVisitors.length - previousCycleVisitors.length) / previousCycleVisitors.length) * 100
      : 0,
  };
}

interface VisitorsCardProps {
  websiteId: string;
  startDate: Date;
  endDate: Date;
}

export async function VisitorsCard({ websiteId, startDate, endDate }: VisitorsCardProps) {
  const stats = await getVisitorsStats(websiteId, startDate, endDate);

  return (
    <Card>
      <CardBody className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">访客</span>
          <div className="rounded-full bg-gray-100 p-2 dark:bg-gray-800">
            <Users className="size-4" />
          </div>
        </div>
        {stats.current === 0 ? (
          <div className="flex flex-col items-center justify-center space-y-2 py-2">
            <Icon
              icon="openmoji:smiling-face-with-open-hands"
              className="size-20"
            />
            <p className="text-sm text-gray-500">该周期暂无访客</p>
          </div>
        ) : (
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-semibold">{stats.current.toString()}</span>
            <span className={`flex items-center text-sm ${stats.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {`${stats.change >= 0 ? '+' : ''}${stats.change.toFixed(1)}%`}
            </span>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
