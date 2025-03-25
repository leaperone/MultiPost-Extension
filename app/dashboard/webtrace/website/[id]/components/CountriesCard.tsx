/**
 * @file 国家来源统计卡片
 */

'use client';

import { Card, CardBody, CardHeader } from '@heroui/react';
import { formatLongNumber } from '@/lib/format';
import useSWR from 'swr';
import { getGeographicalData } from '../actions';
import countries from 'i18n-iso-countries';
import zhLocale from 'i18n-iso-countries/langs/zh.json';

// 初始化 i18n-iso-countries 的中文支持
countries.registerLocale(zhLocale);

interface CountriesCardProps {
  websiteId: string;
  startDate: Date;
  endDate: Date;
}

export function CountriesCard({ websiteId, startDate, endDate }: CountriesCardProps) {
  const { data: mapData } = useSWR(['geographical-data', websiteId, startDate, endDate], () =>
    getGeographicalData(websiteId, startDate, endDate),
  );

  // 手动计算百分比
  const metrics = mapData
    ? (() => {
        const total = mapData.reduce((sum, item) => sum + Number(item.y), 0);
        return mapData.map((item) => {
          const y = Number(item.y);
          const z = (y / total) * 100;
          return {
            x: item.x,
            y,
            z,
          };
        });
      })()
    : [];

  // 按访问量排序
  const sortedMetrics = [...metrics].sort((a, b) => b.y - a.y).slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">访问国家</h2>
      </CardHeader>
      <CardBody>
        <div className="space-y-4">
          {sortedMetrics.map((item) => (
            <div
              key={item.x}
              className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {countries.getName(item.x as string, 'zh') || '未知'}
                  <span className="ml-1 text-xs text-gray-500">({item.x})</span>
                </p>
                <p className="text-xs text-gray-500">{formatLongNumber(item.y)} 访问</p>
              </div>
              <div className="text-sm text-gray-500">{item.z.toFixed(1)}%</div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

export default CountriesCard;
