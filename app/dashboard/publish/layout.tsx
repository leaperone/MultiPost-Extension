'use client';

import { Alert, Tabs, Tab, Button } from '@heroui/react';
import Link from 'next/link';
import { useTranslation } from '@/i18n/client';
import { MessageCircleHeartIcon, VideoIcon, FileTextIcon } from 'lucide-react';
import { usePathname } from 'next/navigation';
import ForceInstallExtension from '@/components/ForceInstallExtension';
import { useEffect } from 'react';
import { funcGetPermission } from '@/lib/extension';

export default function PublishLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation('publish');
  const pathname = usePathname();

  useEffect(() => {
    funcGetPermission().then(() => {});
  }, []);
  return (
    <div className="mx-auto h-full max-w-2xl space-y-6 overflow-y-auto p-4 scrollbar-hide">
      {process.env.NODE_ENV !== 'development' && <ForceInstallExtension />}

      <Tabs
        aria-label="Publish options"
        selectedKey={pathname}
        fullWidth
        classNames={{
          tabList: 'w-full justify-start',
          // tab: 'w-full px-0 h-auto',
        }}>
        <Tab
          key="/dashboard/publish/dynamic"
          href="/dashboard/publish/dynamic"
          title={
            <div className="flex items-center">
              <MessageCircleHeartIcon />
            </div>
          }
        />
        <Tab
          key="/dashboard/publish/video"
          href="/dashboard/publish/video"
          title={
            <div className="flex items-center">
              <VideoIcon className="size-4" />
            </div>
          }
        />
        <Tab
          key="https://md.multipost.app"
          href="https://md.multipost.app"
          title={
            <div className="flex items-center">
              <FileTextIcon className="size-4" />
            </div>
          }
        />
      </Tabs>

      <div className="mx-auto w-full">{children}</div>

      <Alert
        variant="flat"
        color="secondary"
        className="mx-auto mt-4">
        <div>
          {t('contact.message')}{' '}
          <Link
            href="mailto:support@leaper.one"
            className="text-blue-500 hover:underline">
            support@leaper.one
          </Link>{' '}
          {t('contact.or')}{' '}
          <Link
            href="https://github.com/leaperone/Multipost-Extension/issues"
            className="text-blue-500 hover:underline">
            {t('contact.github')}
          </Link>{' '}
          {t('contact.page')}. {t('contact.survey')}{' '}
          <Button
            as={Link}
            href="https://mc1cz6k4he.feishu.cn/share/base/form/shrcnGyzsczESObZ72JhLanY8Xg"
            variant="flat"
            color="secondary"
            size="sm"
            className="ml-1">
            问卷 Survey
          </Button>
        </div>
      </Alert>
    </div>
  );
}
