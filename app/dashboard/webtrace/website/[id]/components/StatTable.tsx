/**
 * @file 统计数据表格组件
 */
import { Card, CardBody, CardHeader, Spacer } from '@heroui/react';
import { cn } from '@/lib/utils';
import { ExternalLink } from 'lucide-react';

export interface StatTableItem {
  key: string;
  label: React.ReactNode;
  count: number;
  percentage: number;
  prefix?: React.ReactNode;
  suffix?: string;
  href?: string;
}

interface StatTableProps {
  title: string;
  items: StatTableItem[];
  className?: string;
  emptyText?: string;
  countSuffix?: string;
}

export function StatTable({ title, items, className, emptyText = '暂无数据', countSuffix = '' }: StatTableProps) {
  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
      </CardHeader>
      <CardBody>
        {items.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-sm text-gray-500">{emptyText}</div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.key}
                className="group flex items-center justify-between">
                <div className="flex flex-1 items-center space-x-2">
                  {item.prefix}
                  <p className="text-sm font-medium">{item.label}</p>
                  <Spacer x={2} />
                  {item.href && (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 opacity-0 transition-opacity group-hover:opacity-100"
                      title="在新标签页中打开">
                      <ExternalLink className="size-4 text-gray-400 hover:text-gray-600" />
                    </a>
                  )}
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <span className="w-20 text-right">
                    {item.count.toLocaleString()} {item.suffix || countSuffix}
                  </span>
                  <span className="px-2 text-gray-300">|</span>
                  <span className="w-12">{item.percentage.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
