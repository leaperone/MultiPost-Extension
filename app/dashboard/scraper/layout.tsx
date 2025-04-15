'use client';

import { Alert, Tabs, Tab } from '@heroui/react';
import Link from 'next/link';
import { useTranslation } from '@/i18n/client';
import { GlobeIcon, SearchIcon } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function ScraperLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation('scraper');
  const pathname = usePathname();

  return (
    <div className="mx-auto size-full space-y-6 overflow-y-auto p-4 scrollbar-hide">
      <div className="mx-auto max-w-7xl">
        <Tabs
          aria-label={t('scraper_options')}
          selectedKey={pathname}
          fullWidth
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
      </div>

      <div className="mx-auto w-full">{children}</div>

      <div className="mx-auto max-w-7xl">
        <Alert
          variant="flat"
          color="secondary">
          <div>
            {t('contact_support')}
            <Link
              href="mailto:support@leaper.one"
              className="text-blue-500 hover:underline">
              support@leaper.one
            </Link>
          </div>
        </Alert>
      </div>
    </div>
  );
}
