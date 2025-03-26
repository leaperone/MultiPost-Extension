'use client';

import { Card, CardBody, CardHeader } from '@heroui/react';
import { format } from 'date-fns';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface VisitTrendsChartProps {
  data: {
    date: string;
    displayDate: string;
    views: number;
    granularity: 'hour' | 'day' | 'month';
  }[];
}

export function VisitTrendsChart({ data }: VisitTrendsChartProps) {
  // 计算合适的 Y 轴刻度
  const maxViews = Math.max(...data.map((item) => item.views));
  const yAxisTicks = Array.from({ length: 5 }, (_, i) => Math.round((maxViews * (i + 1)) / 5)).filter(
    (tick) => tick > 0,
  );

  // 根据时间粒度获取适当的显示文本
  const getTimeRangeText = () => {
    if (data.length === 0) return '';

    const granularity = data[0].granularity;
    switch (granularity) {
      case 'hour':
        return `过去 ${data.length} 小时`;
      case 'day':
        return `过去 ${data.length} 天`;
      case 'month':
        return `过去 ${data.length} 个月`;
      default:
        return `过去 ${data.length} 天`;
    }
  };

  // 根据时间粒度获取X轴的格式化函数
  const getTickFormatter = (value: string) => {
    const date = new Date(value);
    const granularity = data[0]?.granularity;

    switch (granularity) {
      case 'hour':
        return format(date, 'HH:00');
      case 'day':
        return format(date, 'MM-dd');
      case 'month':
        return format(date, 'yyyy-MM');
      default:
        return format(date, 'MM-dd');
    }
  };

  // 根据时间粒度获取工具提示的格式化函数
  const getTooltipDateFormatter = (value: string) => {
    const date = new Date(value);
    const granularity = data[0]?.granularity;

    switch (granularity) {
      case 'hour':
        return format(date, 'yyyy-MM-dd HH:00');
      case 'day':
        return format(date, 'yyyy-MM-dd');
      case 'month':
        return format(date, 'yyyy-MM');
      default:
        return format(date, 'yyyy-MM-dd');
    }
  };

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">访问趋势</h2>
        <div className="text-sm text-gray-500">{getTimeRangeText()}</div>
      </CardHeader>
      <CardBody>
        <div className="h-[300px] w-full">
          <ResponsiveContainer
            width="100%"
            height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient
                  id="colorViews"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1">
                  <stop
                    offset="5%"
                    stopColor="#6366f1"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="#6366f1"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tickFormatter={getTickFormatter}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(value) => {
                  if (value >= 1000000) {
                    return `${(value / 1000000).toFixed(1)}M`;
                  }
                  if (value >= 1000) {
                    return `${(value / 1000).toFixed(1)}K`;
                  }
                  return value.toString();
                }}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                ticks={yAxisTicks}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-white p-2 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="text-sm text-gray-500">日期</div>
                          <div className="text-sm font-medium">{getTooltipDateFormatter(payload[0].payload.date)}</div>
                          <div className="text-sm text-gray-500">浏览量</div>
                          <div className="text-sm font-medium">{payload[0].value?.toLocaleString()}</div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="views"
                stroke="#6366f1"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorViews)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  );
}
