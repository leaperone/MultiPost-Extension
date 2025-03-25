/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useMemo, useState, HTMLAttributes, CSSProperties } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import classNames from 'classnames';
import useSWR from 'swr';
import { HoverTooltip } from './WorldMapHoverToolTip';
import { MAP_FILE } from '@/lib/constants';
import { getGeographicalData } from '../actions';
import { useTheme } from 'next-themes';
import { Card, CardBody } from '@heroui/react';
import styles from './WorldMap.module.css';
import { formatLongNumber } from '@/lib/format';
import countries from 'i18n-iso-countries';
import zhLocale from 'i18n-iso-countries/langs/zh.json';

// 初始化 i18n-iso-countries 的中文支持
countries.registerLocale(zhLocale);

// 添加类型声明
declare module 'react-simple-maps' {
  export interface GeographyProps extends HTMLAttributes<SVGPathElement> {
    geography?: any;
    style?: {
      default?: CSSProperties;
      hover?: CSSProperties;
      pressed?: CSSProperties;
    };
  }
}

interface WorldMapProps {
  websiteId: string;
  startDate: Date;
  endDate: Date;
  className?: string;
}

interface Geography {
  id: string;
  rsmKey: string;
  properties: {
    name: string;
    [key: string]: any;
  };
}

const colors = {
  map: {
    fillColor: '#e5e7eb',
    strokeColor: '#64748b',
    hoverColor: '#d1d5db',
    baseColor: '#3b82f6',
    heatmap: {
      light: {
        lowest: '#F0F9FF',
        low: '#7DD3FC',
        medium: '#0EA5E9',
        high: '#0369A1',
        highest: '#0C4A6E',
      },
      dark: {
        lowest: '#0C4A6E',
        low: '#0369A1',
        medium: '#0EA5E9',
        high: '#7DD3FC',
        highest: '#F0F9FF',
      },
    },
  },
};

const visitorsLabel = '访问者';
const unknownLabel = '未知';

// 特殊地区名称映射
const SPECIAL_REGION_NAMES: Record<string, string> = {
  TW: '中国台湾',
  HK: '中国香港',
  MO: '中国澳门',
};

// 中国及特殊行政区的代码
const CHINA_REGIONS = ['CN', 'TW', 'HK', 'MO'];

export function WorldMap({
  websiteId,
  startDate,
  endDate,
  className,
  ...props
}: WorldMapProps & HTMLAttributes<HTMLDivElement>) {
  const [tooltip, setTooltipPopup] = useState<string | null>(null);
  const { theme } = useTheme();

  const { data: mapData } = useSWR(['geographical-data', websiteId, startDate, endDate], () =>
    getGeographicalData(websiteId, startDate, endDate),
  );

  const metrics = useMemo(
    () =>
      mapData
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
        : [],
    [mapData],
  );

  const getRegionMetrics = (code: string) => {
    if (CHINA_REGIONS.includes(code)) {
      // 如果是中国或特殊行政区，合并所有相关地区的数据
      const total = CHINA_REGIONS.reduce((sum, regionCode) => {
        const region = metrics?.find(({ x }) => x === regionCode);
        return sum + (region?.y || 0);
      }, 0);
      return total;
    }
    // 其他国家/地区返回原始数据
    const country = metrics?.find(({ x }) => x === code);
    return country?.y || 0;
  };

  const getFillColor = (code: string) => {
    if (code === 'AQ') return;

    const value = getRegionMetrics(code);
    if (!value) {
      return colors.map.fillColor;
    }

    // 重新计算百分比，使用合并后的数据
    const total = metrics.reduce((sum, item) => sum + Number(item.y), 0);
    const percentage = (value / total) * 100;
    const colorSet = theme === 'light' ? colors.map.heatmap.light : colors.map.heatmap.dark;

    // 调整颜色分级的阈值，使分布更均匀
    if (percentage <= 10) {
      return colorSet.lowest;
    } else if (percentage <= 30) {
      return colorSet.low;
    } else if (percentage <= 50) {
      return colorSet.medium;
    } else if (percentage <= 70) {
      return colorSet.high;
    } else {
      return colorSet.highest;
    }
  };

  const getOpacity = (code: string) => {
    return code === 'AQ' ? 0 : 1;
  };

  const handleHover = (code: string, name: string, e: React.MouseEvent<SVGPathElement>) => {
    console.log(code, name, e);
    if (code === 'AQ') return;

    const country = metrics?.find(({ x }) => x === code);
    const displayName = SPECIAL_REGION_NAMES[code] || countries.getName(code, 'zh') || name || unknownLabel;

    // 如果是中国或特殊行政区，显示所有相关地区的数据
    if (CHINA_REGIONS.includes(code)) {
      const details = CHINA_REGIONS.map((regionCode) => {
        const region = metrics?.find(({ x }) => x === regionCode);
        const regionName = regionCode === 'CN' ? '中国' : SPECIAL_REGION_NAMES[regionCode];
        return `${regionName}: ${formatLongNumber(region?.y || 0)} ${visitorsLabel}`;
      });
      setTooltipPopup(details.join('\r\n'));
      return;
    }

    setTooltipPopup(`${displayName} (${code}): ${formatLongNumber(country?.y || 0)} ${visitorsLabel}`);
  };

  return (
    <Card className={className}>
      <CardBody>
        <div
          {...props}
          className={classNames(styles.container, 'h-[400px]')}
          data-tip=""
          data-for="world-map-tooltip">
          <ComposableMap projection="geoMercator">
            <ZoomableGroup
              zoom={0.8}
              minZoom={0.7}
              center={[0, 40]}>
              <Geographies geography={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}${MAP_FILE}`}>
                {({ geographies }: { geographies: Geography[] }) => {
                  return geographies.map((geo) => {
                    // world-110m.json 使用 ISO_A2 作为国家代码
                    const code = geo.properties?.ISO_A2;
                    const name = geo.properties?.NAME;

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={getFillColor(code)}
                        stroke={colors.map.strokeColor}
                        strokeWidth={1.5}
                        opacity={getOpacity(code)}
                        style={{
                          default: { outline: 'none' },
                          hover: {
                            outline: 'none',
                            fill: colors.map.hoverColor,
                            strokeWidth: 2,
                          },
                          pressed: { outline: 'none' },
                        }}
                        onMouseOver={(e) => handleHover(code, name, e)}
                        onMouseOut={() => setTooltipPopup(null)}
                      />
                    );
                  });
                }}
              </Geographies>
            </ZoomableGroup>
          </ComposableMap>
          {tooltip && <HoverTooltip>{tooltip}</HoverTooltip>}
        </div>
      </CardBody>
    </Card>
  );
}

export default WorldMap;
