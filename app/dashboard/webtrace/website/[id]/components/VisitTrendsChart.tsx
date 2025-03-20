'use client';

import { Card, CardBody, CardHeader } from '@heroui/react';
import { format } from 'date-fns';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface VisitTrendsChartProps {
  data: {
    date: string;
    views: number;
  }[];
}

export function VisitTrendsChart({ data }: VisitTrendsChartProps) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">访问趋势</h2>
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
                tickFormatter={(value) => format(new Date(value), 'MM-dd')}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(value) => value.toLocaleString()}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-white p-2 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="text-sm text-gray-500">日期</div>
                          <div className="text-sm font-medium">
                            {format(new Date(payload[0].payload.date), 'yyyy-MM-dd')}
                          </div>
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
