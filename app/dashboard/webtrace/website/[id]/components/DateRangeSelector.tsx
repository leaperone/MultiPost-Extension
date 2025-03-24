/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { DateRangePicker } from '@heroui/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import { getLocalTimeZone, parseDate, today } from '@internationalized/date';
import { startOfDay, subDays } from 'date-fns';

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
        const endTimestamp = range.end.toDate(getLocalTimeZone()).getTime();
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
      const defaultEndDate = now.getTime();
      const defaultStartDate = startOfDay(subDays(now, 7)).getTime();

      const params = new URLSearchParams(searchParams.toString());
      params.set('startDate', defaultStartDate.toString());
      params.set('endDate', defaultEndDate.toString());
      router.push(`?${params.toString()}`);
    }
  }, [router, searchParams]);

  return (
    <DateRangePicker
      className="w-[600px]"
      onChange={handleDateRangeChange}
      variant="bordered"
      radius="sm"
      label="选择日期范围"
      maxValue={today(getLocalTimeZone())}
      minValue={parseDate('2025-01-01')}
      visibleMonths={2}
    />
  );
}
