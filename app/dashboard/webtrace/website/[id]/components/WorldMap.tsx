/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useMemo, useState, HTMLAttributes, CSSProperties } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import classNames from 'classnames';
import useSWR from 'swr';
import { HoverTooltip } from './WorldMapHoverToolTip';
import { ISO_COUNTRIES, MAP_FILE } from '@/lib/constants';
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
    strokeColor: '#9ca3af',
    hoverColor: '#d1d5db',
    baseColor: '#3b82f6',
    heatmap: {
      light: {
        lowest: '#EFF6FF', // 非常浅的蓝色
        low: '#93C5FD', // 天蓝色
        medium: '#3B82F6', // 亮蓝色
        high: '#1D4ED8', // 深蓝色
        highest: '#1E3A8A', // 非常深的蓝色
      },
      dark: {
        lowest: '#1E3A8A', // 深蓝色
        low: '#1D4ED8', // 较深蓝色
        medium: '#3B82F6', // 中等蓝色
        high: '#60A5FA', // 浅蓝色
        highest: '#93C5FD', // 非常浅的蓝色
      },
    },
  },
};

const visitorsLabel = '访问者';
const unknownLabel = '未知';

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

  const getFillColor = (code: string) => {
    if (code === 'AQ') return;
    const country = metrics?.find(({ x }) => x === code);

    if (!country) {
      return colors.map.fillColor;
    }

    const percentage = country.z;
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

  const handleHover = (code: string, name: string) => {
    if (code === 'AQ') return;
    const country = metrics?.find(({ x }) => x === code);
    const countryName = countries.getName(code, 'zh') || name || unknownLabel;
    setTooltipPopup(`${countryName} (${code}): ${formatLongNumber(country?.y || 0)} ${visitorsLabel}`);
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
                    const code = ISO_COUNTRIES[geo.id as keyof typeof ISO_COUNTRIES];
                    const name = geo.properties?.name;

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={getFillColor(code)}
                        stroke={colors.map.strokeColor}
                        opacity={getOpacity(code)}
                        style={{
                          default: { outline: 'none' },
                          hover: { outline: 'none', fill: colors.map.hoverColor },
                          pressed: { outline: 'none' },
                        }}
                        onMouseOver={() => handleHover(code, name)}
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
