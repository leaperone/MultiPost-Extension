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

// 特殊地区名称映射
const SPECIAL_REGION_NAMES: Record<string, string> = {
  TW: '中国台湾',
  HK: '中国香港',
  MO: '中国澳门',
};

interface CountriesCardProps {
  websiteId: string;
  startDate: Date;
  endDate: Date;
  isDetail?: boolean;
  className?: string;
}

export function CountriesCard({ websiteId, startDate, endDate, isDetail, className }: CountriesCardProps) {
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
            label: SPECIAL_REGION_NAMES[item.x as string] || countries.getName(item.x as string, 'zh') || '未知',
            count: y,
            percentage: z,
          };
        });
      })()
    : [];

  // 按访问量排序
  const sortedMetrics = [...metrics].sort((a, b) => b.count - a.count);
  const top10Metrics = sortedMetrics.slice(0, 10);

  return (
    <StatTable
      title="访问国家/地区"
      items={isDetail ? sortedMetrics : top10Metrics}
      className={className}
      showMoreButton={!isDetail}
      detailType="countries"
    />
  );
}
export default CountriesCard;
