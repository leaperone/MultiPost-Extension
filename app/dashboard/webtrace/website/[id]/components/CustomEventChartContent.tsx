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

interface ChartContentProps {
  data: Record<string, string | number>[];
  eventTypes: string[];
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
}

// 自定义 Tooltip 样式
const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white/95 p-4 shadow-lg backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/95">
      <p className="mb-2 font-medium text-gray-900 dark:text-gray-100">
        {label && format(new Date(label), 'yyyy-MM-dd')}
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
  const { payload } = props;

  return (
    <div className="flex flex-wrap justify-center gap-4 px-4 pt-4">
      {payload.map((entry: any, index: number) => (
        <div
          key={entry.value}
          className="flex items-center gap-2">
          <div
            className="size-2.5 rounded-full"
            style={{ backgroundColor: COLORS[index % COLORS.length] }}
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export function ChartContent({ data, eventTypes }: ChartContentProps) {
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
          tickFormatter={(value) => format(new Date(value), 'MM-dd', { locale: zhCN })}
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
          content={<CustomTooltip />}
          cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
        />
        <Legend content={<CustomLegend />} />
        {eventTypes.map((type, index) => (
          <Bar
            key={type}
            dataKey={type}
            stackId="a"
            fill={COLORS[index % COLORS.length]}
            name={type}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
