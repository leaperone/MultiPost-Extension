'use client';

import { Tabs, Tab } from '@heroui/react';
import { useTranslation } from '@/i18n/client';
import { GlobeIcon, SearchIcon } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function ScraperTabs() {
  const { t } = useTranslation('scraper');
  const pathname = usePathname();
  return (
    <Tabs
      aria-label={t('scraper_options')}
      selectedKey={pathname}
      fullWidth
      size="sm"
      classNames={{
        tabList: 'w-full justify-start',
      }}>
      <Tab
        key="/dashboard/scraper/web"
        href="/dashboard/scraper/web"
        title={
          <div className="flex items-center gap-2">
            <GlobeIcon className="size-4" />
            <span>{t('web_scraping')}</span>
          </div>
        }
      />
      <Tab
        key="/dashboard/scraper/search"
        href="/dashboard/scraper/search"
        title={
          <div className="flex items-center gap-2">
            <SearchIcon className="size-4" />
            <span>{t('search')}</span>
          </div>
        }
      />
    </Tabs>
  );
}
