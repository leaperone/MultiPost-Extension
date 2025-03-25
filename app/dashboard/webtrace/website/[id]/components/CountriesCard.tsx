/**
 * @file 国家来源统计卡片
 */

'use client';

import useSWR from 'swr';
import { getGeographicalData } from '../actions';
import countries from 'i18n-iso-countries';
import zhLocale from 'i18n-iso-countries/langs/zh.json';
import { StatTable } from './StatTable';

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
            key: item.x || 'unknown',
            label: (
              <>
                {countries.getName(item.x as string, 'zh') || '未知'}
                <span className="ml-1 text-xs text-gray-500">({item.x})</span>
              </>
            ),
            count: y,
            percentage: z,
          };
        });
      })()
    : [];

  // 按访问量排序
  const sortedMetrics = [...metrics].sort((a, b) => b.count - a.count).slice(0, 10);

  return (
    <StatTable
      title="访问国家/地区"
      items={sortedMetrics}
    />
  );
}

export default CountriesCard;
