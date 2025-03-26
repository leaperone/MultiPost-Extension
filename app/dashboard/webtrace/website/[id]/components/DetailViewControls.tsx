'use client';

import { useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Tabs, Tab, Spacer } from '@heroui/react';
import { ChevronLeft } from 'lucide-react';
import { DETAIL_OPTIONS } from '@/lib/constants';

interface DetailViewControlsProps {
  selectedDetail: string;
}

export function DetailViewControls({ selectedDetail }: DetailViewControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 返回概览
  const handleBackToOverview = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    params.delete('detail');
    router.push(`${pathname}?${params.toString()}`);
  }, [pathname, router, searchParams]);

  // 切换详细视图类型
  const handleDetailChange = useCallback(
    (key: React.Key) => {
      if (key === 'overview') {
        handleBackToOverview();
        return;
      }
      const params = new URLSearchParams(searchParams);
      params.set('detail', String(key));
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams, handleBackToOverview],
  );

  return (
    <div className="flex w-full flex-col">
      <Spacer y={4} />
      <Tabs
        selectedKey={selectedDetail}
        onSelectionChange={handleDetailChange}
        variant="underlined"
        color="primary"
        isVertical
        aria-label="统计数据类别"
        classNames={{
          base: 'w-full',
          tabList: 'gap-2',
          tab: 'justify-start px-4 py-3 text-base font-medium',
        }}>
        <Tab
          key="overview"
          title={
            <div className="flex items-center">
              <ChevronLeft className="mr-2 size-4" />
              返回概览
            </div>
          }
        />
        {DETAIL_OPTIONS.map((option) => (
          <Tab
            key={option.key}
            title={option.label}
          />
        ))}
      </Tabs>
    </div>
  );
}
