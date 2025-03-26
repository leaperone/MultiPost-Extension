/**
 * @file 屏幕分辨率统计卡片
 */

'use server';

import { multipostDb } from '@/lib/db';
import { StatTable } from './StatTable';

async function getScreenStats(websiteId: string, startDate: Date, endDate: Date, isDetail?: boolean) {
  const screens = await multipostDb.visitorSession.groupBy({
    by: ['screen'],
    where: {
      websiteId,
      createdAt: {
        gte: startDate,
        lt: endDate,
      },
      screen: {
        not: null,
      },
    },
    _count: {
      screen: true,
    },
    orderBy: {
      _count: {
        screen: 'desc',
      },
    },
    take: isDetail ? undefined : 10,
  });

  const total = screens.reduce((acc, curr) => acc + curr._count.screen, 0);

  return screens.map((item) => ({
    key: item.screen || 'unknown',
    label: item.screen || 'Unknown',
    count: item._count.screen,
    percentage: (item._count.screen / total) * 100,
  }));
}

interface ScreensCardProps {
  websiteId: string;
  startDate: Date;
  endDate: Date;
  className?: string;
  isDetail?: boolean;
}

export async function ScreensCard({ websiteId, startDate, endDate, className, isDetail }: ScreensCardProps) {
  const stats = await getScreenStats(websiteId, startDate, endDate, isDetail);

  return (
    <StatTable
      title="屏幕分辨率"
      items={stats}
      className={className}
      showMoreButton={!isDetail}
      detailType="screens"
    />
  );
}
