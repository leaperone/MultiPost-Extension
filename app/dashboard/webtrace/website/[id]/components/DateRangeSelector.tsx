/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { DateRangePicker, Button, ButtonGroup } from '@heroui/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import { getLocalTimeZone, parseDate, today } from '@internationalized/date';
import { startOfDay, subDays, endOfDay, subHours } from 'date-fns';

export function DateRangeSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();

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
        // 3天、7天、30天：从现在往前推N天
        startDate = startOfDay(subDays(now, type)).getTime();
        endDate = now.getTime();
      }

      const params = new URLSearchParams(searchParams.toString());
      params.set('startDate', startDate.toString());
      params.set('endDate', endDate.toString());
      router.push(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  return (
    <div className="space-y-4">
      <DateRangePicker
        className="w-[600px]"
        onChange={handleDateRangeChange}
        variant="bordered"
        radius="sm"
        label="选择日期范围"
        maxValue={today(getLocalTimeZone())}
        minValue={parseDate('2025-01-01')}
        visibleMonths={3}
        // labelPlacement="outside-left"
        CalendarTopContent={
          <ButtonGroup
            fullWidth
            className="bg-content1 px-3 pb-2 pt-3 [&>button]:border-default-200/60 [&>button]:text-default-500"
            radius="full"
            size="sm"
            variant="bordered">
            <Button onPress={() => handleQuickSelect('today')}>今天</Button>
            <Button onPress={() => handleQuickSelect('24h')}>24小时内</Button>
            <Button onPress={() => handleQuickSelect(3)}>3天内</Button>
            <Button onPress={() => handleQuickSelect(7)}>7天内</Button>
            <Button onPress={() => handleQuickSelect(30)}>30天内</Button>
          </ButtonGroup>
        }
      />
    </div>
  );
}
