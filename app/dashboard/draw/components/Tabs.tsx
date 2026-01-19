'use client';
import { Tabs, Tab } from '@heroui/react';
import { ImageIcon, PaletteIcon } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from '@/i18n/client';

export default function HeaderTabs() {
  const pathname = usePathname();
  const router = useRouter();
  const { t: tImages } = useTranslation('images');
  const { t: tPoster } = useTranslation('poster');
  const baseUrl = '/dashboard/draw';

  const handleSelectionChange = (key: React.Key) => {
    router.push(key as string);
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
