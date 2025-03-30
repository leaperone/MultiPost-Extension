/**
 * @file 自定义事件时间趋势图组件
 */

import { Card, CardHeader, CardBody } from '@heroui/react';
import { cn } from '@/lib/utils';
import { multipostDb } from '@/lib/db';
import { differenceInDays, differenceInHours, addDays, addHours, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { ChartContent } from './CustomEventChart';

type TimeGranularity = 'hour' | 'day' | 'month';

/**
 * 获取自定义事件趋势数据
 */
async function getCustomEventTrends(websiteId: string, startDate: Date, endDate: Date, timezone: string) {
  // 计算时间范围
  const daysDiff = differenceInDays(endDate, startDate);
  const hoursDiff = differenceInHours(endDate, startDate);

  // 确定时间粒度: 小于48小时按小时, 小于90天按天, 否则按月
  const granularity: TimeGranularity = hoursDiff < 48 ? 'hour' : daysDiff < 90 ? 'day' : 'month';

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

  // 根据粒度生成不同的日期数组
  let dates: string[] = [];
  let dateFormat: string;

  if (granularity === 'hour') {
    // 小时数
    const hours = hoursDiff + 1;
    dateFormat = 'yyyy-MM-dd HH:00';

    // 生成小时数组
    dates = Array.from({ length: hours }, (_, i) => {
      const date = addHours(startDate, i);
      return formatInTimeZone(date, timezone, dateFormat);
    });
  } else if (granularity === 'day') {
    // 天数
    const days = daysDiff + 1;
    dateFormat = 'yyyy-MM-dd';

    // 生成日期数组
    dates = Array.from({ length: days }, (_, i) => {
      const date = addDays(startDate, i);
      return formatInTimeZone(date, timezone, dateFormat);
    });
  } else {
    // 计算月份范围
    const startMonth = startOfMonth(startDate);
    const endMonth = endOfMonth(endDate);
    const monthsDiff = Math.floor(differenceInDays(endMonth, startMonth) / 30) + 1;
    dateFormat = 'yyyy-MM';

    // 生成月份数组
    dates = Array.from({ length: monthsDiff }, (_, i) => {
      const date = addMonths(startMonth, i);
      return formatInTimeZone(date, timezone, dateFormat);
    });
  }

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

      // 按设定的时间粒度合并数据
      const periodCounts = events.reduce(
        (acc, event) => {
          const dateStr = formatInTimeZone(event.createdAt, timezone, dateFormat);
          acc[dateStr] = (acc[dateStr] || 0) + event._count._all;
          return acc;
        },
        {} as Record<string, number>,
      );

      return {
        eventName: type.eventName,
        counts: periodCounts,
      };
    }),
  );

  // 整理数据
  const data = dates.map((date) => {
    const result: Record<string, string | number> = {
      date,
      granularity,
    };

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
    granularity,
  };
}

interface CustomEventChartCardProps {
  websiteId: string;
  startDate: Date;
  endDate: Date;
  timezone: string;
  className?: string;
}

export async function CustomEventChartCard({
  websiteId,
  startDate,
  endDate,
  timezone,
  className,
}: CustomEventChartCardProps) {
  const chartData = await getCustomEventTrends(websiteId, startDate, endDate, timezone);

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader>
        <h3 className="text-lg font-semibold">事件趋势</h3>
      </CardHeader>
      <CardBody>
        {!chartData || chartData.data.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-gray-500 sm:h-[250px] md:h-[300px]">
            暂无数据
          </div>
        ) : (
          <div className="h-[200px] sm:h-[250px] md:h-[300px]">
            <ChartContent
              data={chartData.data}
              eventTypes={chartData.eventTypes}
              granularity={chartData.granularity}
            />
          </div>
        )}
      </CardBody>
    </Card>
  );
}
