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

import styles from './WorldMap.module.css';
import { formatLongNumber } from '@/lib/format';
import { percentFilter } from '@/lib/filter';

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

// TODO: 颜色分级，目前地图颜色变化不明显，不知道什么问题，考虑是地图文件的问题

const colors = {
  map: {
    fillColor: '#e5e7eb',
    strokeColor: '#9ca3af',
    hoverColor: '#d1d5db',
    baseColor: '#3b82f6',
    heatmap: {
      light: {
        lowest: '#DBEAFE', // 最低值 - 非常浅的蓝
        low: '#2563EB', // 较低值 - 鲜艳的蓝
        medium: '#FECACA', // 中等值 - 浅红
        high: '#DC2626', // 较高值 - 鲜艳的红
        highest: '#7F1D1D', // 最高值 - 深红
      },
      dark: {
        lowest: '#1E40AF', // 最低值 - 深蓝
        low: '#60A5FA', // 较低值 - 亮蓝
        medium: '#FCA5A5', // 中等值 - 浅红
        high: '#EF4444', // 较高值 - 鲜红
        highest: '#B91C1C', // 最高值 - 暗红
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

  const metrics = useMemo(() => (mapData ? percentFilter(mapData as any[]) : []), [mapData]);

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
    setTooltipPopup(`${name || unknownLabel}: ${formatLongNumber(country?.y || 0)} ${visitorsLabel}`);
  };

  return (
    <div
      {...props}
      className={classNames(styles.container, className)}
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
  );
}

export default WorldMap;
