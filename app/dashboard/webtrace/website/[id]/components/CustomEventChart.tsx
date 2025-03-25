/**
 * @file 自定义事件时间趋势图组件
 */

import { Card, CardHeader, CardBody } from '@heroui/react';
import { cn } from '@/lib/utils';
import { multipostDb } from '@/lib/db';
import { format, differenceInDays, addDays } from 'date-fns';
import { ChartContent } from './CustomEventChartContent';

/**
 * 获取自定义事件趋势数据
 */
async function getCustomEventTrends(websiteId: string, startDate: Date, endDate: Date) {
  // 获取所有事件类型
  const eventTypes = await multipostDb.websiteEvent.groupBy({
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
  });

  // 计算天数（包含开始和结束日期）
  const days = differenceInDays(endDate, startDate) + 1;

  // 生成日期数组，使用本地时间
  const dates: string[] = Array.from({ length: days }, (_, i) => {
    const date = addDays(startDate, i);
    return format(date, 'yyyy-MM-dd');
  });

  // 获取每个事件类型的聚合数据
  const eventCounts = await Promise.all(
    eventTypes.map(async (type) => {
      // 获取该事件类型在日期范围内的所有事件数据
      const events = await multipostDb.websiteEvent.groupBy({
        by: ['createdAt'],
        where: {
          websiteId,
          eventName: type.eventName,
          eventType: 2,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _count: {
          _all: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      // 按天合并数据
      const dailyCounts = events.reduce(
        (acc, event) => {
          const dateStr = format(event.createdAt, 'yyyy-MM-dd');
          acc[dateStr] = (acc[dateStr] || 0) + event._count._all;
          return acc;
        },
        {} as Record<string, number>,
      );

      return {
        eventName: type.eventName,
        counts: dailyCounts,
      };
    }),
  );

  // 整理数据
  const data = dates.map((date) => {
    const result: Record<string, string | number> = { date };
    eventCounts.forEach((event) => {
      if (event.eventName) {
        result[event.eventName] = event.counts[date] || 0;
      }
    });
    return result;
  });

  return {
    data,
    eventTypes: eventTypes.map((type) => type.eventName as string).filter(Boolean),
  };
}

interface CustomEventChartProps {
  websiteId: string;
  startDate: Date;
  endDate: Date;
  className?: string;
}

export async function CustomEventChart({ websiteId, startDate, endDate, className }: CustomEventChartProps) {
  const chartData = await getCustomEventTrends(websiteId, startDate, endDate);

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <h3 className="text-lg font-semibold">事件趋势</h3>
      </CardHeader>
      <CardBody>
        {!chartData || chartData.data.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-sm text-gray-500">暂无数据</div>
        ) : (
          <ChartContent
            data={chartData.data}
            eventTypes={chartData.eventTypes}
          />
        )}
      </CardBody>
    </Card>
  );
}
