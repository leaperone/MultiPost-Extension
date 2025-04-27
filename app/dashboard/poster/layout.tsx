'use client';

import { Tabs, Tab } from '@heroui/react';
import { useTranslation } from '@/i18n/client';
import { GalleryHorizontalIcon, ImageIcon } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function PostersLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation('poster');
  const pathname = usePathname();

  return (
    <div className="mx-auto grid h-full grid-rows-[auto_1fr_auto] gap-4 p-4">
      {/* Tabs Navigation */}
      <div className="mx-auto w-full max-w-7xl">
        <Tabs
          aria-label={t('posters_options')}
          selectedKey={pathname}
          fullWidth
          size="sm"
          classNames={{
            tabList: 'w-full justify-start',
          }}>
          <Tab
            key="/dashboard/poster/generation"
            href="/dashboard/poster/generation"
            title={
              <div className="flex items-center gap-2">
                <ImageIcon className="size-4" />
                <span>{t('generation')}</span>
              </div>
            }
          />
          <Tab
            key="/dashboard/poster/gallery"
            href="/dashboard/poster/gallery"
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
