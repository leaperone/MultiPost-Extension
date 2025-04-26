'use client';

import { Tabs, Tab } from '@heroui/react';
import { useTranslation } from '@/i18n/client';
import { GalleryHorizontalIcon, ImageIcon } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function ImagesLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation('images');
  const pathname = usePathname();

  return (
    <div className="mx-auto grid h-full grid-rows-[auto_1fr_auto] gap-4 p-4">
      {/* Tabs Navigation */}
      <div className="mx-auto w-full max-w-7xl">
        <Tabs
          aria-label={t('images_options')}
          selectedKey={pathname}
          fullWidth
          size="sm"
          classNames={{
            tabList: 'w-full justify-start',
          }}>
          <Tab
            key="/dashboard/images/generation"
            href="/dashboard/images/generation"
            title={
              <div className="flex items-center gap-2">
                <ImageIcon className="size-4" />
                <span>{t('generation')}</span>
              </div>
            }
          />
          <Tab
            key="/dashboard/images/gallery"
            href="/dashboard/images/gallery"
            title={
              <div className="flex items-center gap-2">
                <GalleryHorizontalIcon className="size-4" />
                <span>{t('gallery')}</span>
              </div>
            }
          />
        </Tabs>
      </div>

      {/* Main Content */}
      <div className="w-full overflow-auto">{children}</div>
    </div>
  );
}
