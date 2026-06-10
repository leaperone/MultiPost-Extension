import { Tabs, Tab } from '@heroui/react';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { ImageIcon, PaletteIcon } from 'lucide-react';
import type { Key } from 'react';

import { useTranslation } from '@/src/i18n/client';

export default function HeaderTabs() {
  const pathname = useLocation({
    select: (location) => location.pathname,
  });
  const navigate = useNavigate();
  const { t: tImages } = useTranslation('images');
  const { t: tPoster } = useTranslation('poster');
  const baseUrl = '/dashboard/draw';

  const handleSelectionChange = (key: Key) => {
    void navigate({ to: key as '/dashboard/draw/image' | '/dashboard/draw/poster' });
  };

  return (
    <Tabs
      aria-label="Draw Options"
      color="primary"
      variant="solid"
      selectedKey={pathname}
      onSelectionChange={handleSelectionChange}
      classNames={{
        base: 'w-full',
        tabList: 'w-full gap-2 p-1 bg-default-100 rounded-lg',
        cursor: 'bg-background shadow-sm rounded-md',
        tab: 'h-9 px-4',
        tabContent: 'text-default-500 group-data-[selected=true]:text-foreground group-data-[selected=true]:font-medium',
      }}>
      <Tab
        key={`${baseUrl}/image`}
        title={
          <div className="flex items-center gap-2">
            <ImageIcon className="size-4" />
            <span>{tImages('tab_title')}</span>
          </div>
        }
      />
      <Tab
        key={`${baseUrl}/poster`}
        title={
          <div className="flex items-center gap-2">
            <PaletteIcon className="size-4" />
            <span>{tPoster('tab_title')}</span>
          </div>
        }
      />
    </Tabs>
  );
}
