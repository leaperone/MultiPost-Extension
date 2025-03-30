/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { DateRangePicker, Button, ButtonGroup } from '@heroui/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { getLocalTimeZone, parseDate, today } from '@internationalized/date';
import { startOfDay, subDays, endOfDay, subHours } from 'date-fns';

export function DateRangeSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // 使用窗口宽度来决定显示的月份数量
  const [visibleMonths, setVisibleMonths] = useState(1);
  // 判断是否是小屏幕设备
  const [isMobile, setIsMobile] = useState(false);

  // 在组件挂载时和窗口大小变化时更新可见月份数和设备类型
  useEffect(() => {
    const updateViewport = () => {
      if (typeof window !== 'undefined') {
        const width = window.innerWidth;
        setIsMobile(width < 640);

        if (width >= 1024) {
          setVisibleMonths(3);
        } else if (width >= 768) {
          setVisibleMonths(2);
        } else {
          setVisibleMonths(1);
        }
      }
    };

    // 初始化运行一次
    updateViewport();

    // 添加调整大小监听器
    window.addEventListener('resize', updateViewport);

    // 清理
    return () => {
      window.removeEventListener('resize', updateViewport);
    };
  }, []);

  const handleDateRangeChange = useCallback(
    (range: any) => {
      const params = new URLSearchParams(searchParams.toString());

      if (range?.start) {
        const startTimestamp = range.start.toDate(getLocalTimeZone()).getTime();
        params.set('startDate', startTimestamp.toString());
      } else {
        params.delete('startDate');
      }

      if (range?.end) {
        const endTimestamp = endOfDay(range.end.toDate(getLocalTimeZone())).getTime();
        params.set('endDate', endTimestamp.toString());
      } else {
        params.delete('endDate');
      }

      router.push(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  // 在组件挂载时，如果没有日期范围参数就设置默认值
  useEffect(() => {
    if (!searchParams.has('startDate') || !searchParams.has('endDate')) {
      const now = new Date();
      const defaultEndDate = endOfDay(now).getTime();
      const defaultStartDate = startOfDay(subDays(now, 7)).getTime();

      const params = new URLSearchParams(searchParams.toString());
      params.set('startDate', defaultStartDate.toString());
      params.set('endDate', defaultEndDate.toString());
      router.push(`?${params.toString()}`);
    }
  }, [router, searchParams]);

  const handleQuickSelect = useCallback(
    (type: 'today' | '24h' | number) => {
      const now = new Date();
      let startDate: number;
      let endDate: number;

      if (type === 'today') {
        // 今天：从今天凌晨 0 点到现在
        startDate = startOfDay(now).getTime();
        endDate = now.getTime();
      } else if (type === '24h') {
        // 24小时内：从现在往前推24小时
        startDate = subHours(now, 24).getTime();
        endDate = now.getTime();
      } else {
        // 3天、7天、30天：从N天前的开始时间到今天的结束时间
        startDate = startOfDay(subDays(now, type - 1)).getTime();
        endDate = endOfDay(now).getTime();
      }

      const params = new URLSearchParams(searchParams.toString());
      params.set('startDate', startDate.toString());
      params.set('endDate', endDate.toString());
      router.push(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  // 移动端快速选择按钮
  const QuickSelectButtons = () => (
    <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-5'} w-full gap-1`}>
      <Button
        size="sm"
        variant="bordered"
        className="border-default-200/60 text-default-500"
        onPress={() => handleQuickSelect('today')}>
        今天
      </Button>
      <Button
        size="sm"
        variant="bordered"
        className="border-default-200/60 text-default-500"
        onPress={() => handleQuickSelect('24h')}>
        24小时
      </Button>
      <Button
        size="sm"
        variant="bordered"
        className="border-default-200/60 text-default-500"
        onPress={() => handleQuickSelect(3)}>
        3天
      </Button>
      <Button
        size="sm"
        variant="bordered"
        className="border-default-200/60 text-default-500"
        onPress={() => handleQuickSelect(7)}>
        7天
      </Button>
      <Button
        size="sm"
        variant="bordered"
        className={`border-default-200/60 text-default-500 ${isMobile ? 'col-span-2' : ''}`}
        onPress={() => handleQuickSelect(30)}>
        30天
      </Button>
    </div>
  );

  return (
    <div className="w-full space-y-4">
      {/* 移动端在日期选择器前显示快速选择按钮 */}
      {isMobile && (
        <div className="mb-2">
          <QuickSelectButtons />
        </div>
      )}

      <DateRangePicker
        className="w-full sm:w-[300px] md:w-[400px] lg:w-[600px]"
        onChange={handleDateRangeChange}
        variant="bordered"
        radius="sm"
        label="选择日期范围"
        maxValue={today(getLocalTimeZone())}
        minValue={parseDate('2025-01-01')}
        visibleMonths={visibleMonths}
        // labelPlacement="outside-left"
        CalendarTopContent={
          !isMobile ? (
            <div className="bg-content1 px-3 pb-2 pt-3">
              <ButtonGroup
                fullWidth
                className="inline-flex flex-nowrap overflow-x-auto"
                size="sm"
                radius="full"
                variant="bordered">
                <Button
                  className="border-default-200/60 text-default-500"
                  onPress={() => handleQuickSelect('today')}>
                  今天
                </Button>
                <Button
                  className="border-default-200/60 text-default-500"
                  onPress={() => handleQuickSelect('24h')}>
                  24小时
                </Button>
                <Button
                  className="border-default-200/60 text-default-500"
                  onPress={() => handleQuickSelect(3)}>
                  3天
                </Button>
                <Button
                  className="border-default-200/60 text-default-500"
                  onPress={() => handleQuickSelect(7)}>
                  7天
                </Button>
                <Button
                  className="border-default-200/60 text-default-500"
                  onPress={() => handleQuickSelect(30)}>
                  30天
                </Button>
              </ButtonGroup>
            </div>
          ) : null
        }
      />
    </div>
  );
}
