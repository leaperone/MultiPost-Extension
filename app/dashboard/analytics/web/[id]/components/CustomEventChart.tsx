/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useState } from 'react';

interface ChartContentProps {
  data: Record<string, string | number>[];
  eventTypes: string[];
  granularity: 'hour' | 'day' | 'month';
}

// 现代感纯色配置
const COLORS = [
  '#06b6d4', // cyan-500
  '#8b5cf6', // violet-500
  '#f97316', // orange-500
  '#22c55e', // green-500
  '#ec4899', // pink-500
  '#3b82f6', // blue-500
  '#f43f5e', // rose-500
  '#a855f7', // purple-500
  '#eab308', // yellow-500
  '#14b8a6', // teal-500
];

interface CustomTooltipProps extends TooltipProps<number, string> {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    color: string;
  }>;
  label?: string;
  granularity?: 'hour' | 'day' | 'month';
}

// 自定义 Tooltip 样式
const CustomTooltip = ({ active, payload, label, granularity }: CustomTooltipProps) => {
  if (!active || !payload) return null;

  // 根据时间粒度获取合适的日期格式
  const getDateFormat = () => {
    switch (granularity) {
      case 'hour':
        return 'yyyy-MM-dd HH:00';
      case 'day':
        return 'yyyy-MM-dd';
      case 'month':
        return 'yyyy-MM';
      default:
        return 'yyyy-MM-dd';
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white/95 p-4 shadow-lg backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/95">
      <p className="mb-2 font-medium text-gray-900 dark:text-gray-100">
        {label && format(new Date(label), getDateFormat())}
      </p>
      <div className="space-y-1.5">
        {payload.map((entry, index) => (
          <div
            key={index}
            className="flex items-center gap-2">
            <div
              className="size-2.5 rounded-full"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{entry.name}:</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">{entry.value.toLocaleString()} 次</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// 自定义图例样式
const CustomLegend = (props: any) => {
  const { eventTypes, onClick, inactiveTypes } = props;

  return (
    <div className="flex flex-wrap justify-center gap-4 px-4 pt-4">
      {eventTypes.map((type: string, index: number) => (
        <div
          key={type}
          className="flex cursor-pointer items-center gap-2 transition-opacity hover:opacity-80"
          onClick={() => onClick?.(type)}
          role="button"
          tabIndex={0}>
          <div
            className="size-2.5 rounded-full"
            style={{
              backgroundColor: COLORS[index % COLORS.length],
              opacity: inactiveTypes.includes(type) ? 0.3 : 1,
            }}
          />
          <span
            className="text-sm text-gray-600 dark:text-gray-400"
            style={{ opacity: inactiveTypes.includes(type) ? 0.5 : 1 }}>
            {type}
          </span>
        </div>
      ))}
    </div>
  );
};

export function ChartContent({ data, eventTypes, granularity }: ChartContentProps) {
  const [inactiveTypes, setInactiveTypes] = useState<string[]>([]);

  const handleLegendClick = (type: string) => {
    setInactiveTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  };

  // 获取活跃的事件类型（未被禁用的）
  const activeTypes = eventTypes.filter((type) => !inactiveTypes.includes(type));

  // 根据时间粒度获取X轴的格式化函数
  const getTickFormatter = (value: string) => {
    const date = new Date(value);

    switch (granularity) {
      case 'hour':
        return format(date, 'HH:00', { locale: zhCN });
      case 'day':
        return format(date, 'MM-dd', { locale: zhCN });
      case 'month':
        return format(date, 'yyyy-MM', { locale: zhCN });
      default:
        return format(date, 'MM-dd', { locale: zhCN });
    }
  };

  return (
    <ResponsiveContainer
      width="100%"
      height={300}>
      <BarChart
        data={data}
        margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
        className="[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700">
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tickFormatter={getTickFormatter}
          tick={{ fontSize: 12 }}
          stroke="#9CA3AF"
          tickLine={false}
        />
        <YAxis
          tickFormatter={(value) => value.toLocaleString()}
          tick={{ fontSize: 12 }}
          stroke="#9CA3AF"
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          content={<CustomTooltip granularity={granularity} />}
          cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
        />
        <Legend
          content={
            <CustomLegend
              eventTypes={eventTypes}
              onClick={handleLegendClick}
              inactiveTypes={inactiveTypes}
            />
          }
        />
        {activeTypes.map((type, index) => (
          <Bar
            key={type}
            dataKey={type}
            stackId="a"
            fill={COLORS[index % COLORS.length]}
            name={type}
            radius={index === activeTypes.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
            isAnimationActive={true}
            animationBegin={0}
            animationDuration={400}
            animationEasing="ease"
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
