'use server';

import { multipostDb } from '@/lib/db';
import { Users } from 'lucide-react';
import { Card, CardBody } from '@heroui/react';
import { Icon } from '@iconify/react';

async function getSessionsStats(websiteId: string, startDate: Date, endDate: Date) {
  // 获取当前周期访客数
  const currentCycleSessions = await multipostDb.visitorSession.count({
    where: {
      websiteId,
      createdAt: {
        gte: startDate,
        lt: endDate,
      },
    },
  });

  // 计算上一周期的时间范围
  const timeSpan = endDate.getTime() - startDate.getTime();
  const previousCycleStart = new Date(startDate.getTime() - timeSpan);
  const previousCycleEnd = startDate;

  // 获取上一周期数据用于计算增长率
  const previousCycleSessions = await multipostDb.visitorSession.count({
    where: {
      websiteId,
      createdAt: {
        gte: previousCycleStart,
        lt: previousCycleEnd,
      },
    },
  });

  return {
    current: currentCycleSessions,
    change: previousCycleSessions ? ((currentCycleSessions - previousCycleSessions) / previousCycleSessions) * 100 : 0,
  };
}

interface SessionsCardProps {
  websiteId: string;
  startDate: Date;
  endDate: Date;
}

export async function SessionsCard({ websiteId, startDate, endDate }: SessionsCardProps) {
  const stats = await getSessionsStats(websiteId, startDate, endDate);

  return (
    <Card>
      <CardBody className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">会话数</span>
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
            <p className="text-sm text-gray-500">该周期暂无会话</p>
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
