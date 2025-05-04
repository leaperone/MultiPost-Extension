'use client';
import { Tabs, Tab } from '@heroui/react';
import { ImageIcon, PaletteIcon } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function HeaderTabs() {
  const pathname = usePathname();
  const baseUrl = '/dashboard/draw';

  return (
    <Tabs
      aria-label="Draw Options"
      color="primary"
      variant="underlined"
      selectedKey={pathname}
      classNames={{
        tabList: 'gap-4 w-full relative rounded-xl p-2 bg-default-100',
        cursor: 'bg-primary/20 shadow-md',
        tab: 'max-w-fit px-4 h-10 hover:text-primary',
        tabContent: 'group-data-[selected=true]:text-primary',
      }}>
      <Tab
        key={`${baseUrl}/image`}
        title={
          <div className="flex items-center space-x-2">
            <ImageIcon className="size-4" />
            <span>Image</span>
          </div>
        }
        href={`${baseUrl}/image`}
      />
      <Tab
        key={`${baseUrl}/poster`}
        title={
          <div className="flex items-center space-x-2">
            <PaletteIcon className="size-4" />
            <span>Poster</span>
          </div>
        }
        href={`${baseUrl}/poster`}
      />
    </Tabs>
  );
}
