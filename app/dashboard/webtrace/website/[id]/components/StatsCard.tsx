import { Card, CardBody } from '@heroui/react';

interface StatsCardProps {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: React.ReactNode;
}

export function StatsCard({ title, value, change, trend, icon }: StatsCardProps) {
  return (
    <Card>
      <CardBody className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">{title}</span>
          <div className="rounded-full bg-gray-100 p-2 dark:bg-gray-800">{icon}</div>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-semibold">{value}</span>
          <span className={`flex items-center text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {change}
          </span>
        </div>
      </CardBody>
    </Card>
  );
}
