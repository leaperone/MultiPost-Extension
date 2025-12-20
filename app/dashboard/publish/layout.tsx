'use client';

import { Tabs, Tab, addToast, Spacer, Divider, Button, Link } from '@heroui/react';
import { MessageCircleHeartIcon, VideoIcon, FileTextIcon, PodcastIcon, MessageSquareIcon } from 'lucide-react';
import { usePathname } from 'next/navigation';
import ForceInstallExtension from '@/components/ForceInstallExtension';
import { useEffect } from 'react';
import { checkServiceStatus, funcGetPermission } from '@/lib/extension';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/i18n/client';
// TODO: 暂时隐藏余额功能
// import BalanceButtonClient from '../components/BalanceButtonClient';

export default function PublishLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation('publish');

  useEffect(() => {
    checkServiceStatus().then((status) => {
      if (!status) {
        addToast({
          title: t('extensionNotDetected.title'),
          description: t('extensionNotDetected.description'),
        });
        router.push('/extension');
        return;
      }
      funcGetPermission().then(() => {});
      return;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-screen flex-col p-1">
      {process.env.NODE_ENV !== 'development' && <ForceInstallExtension />}

      {/* Fixed header with tabs */}
      <div className="shrink-0">
        <div className="flex w-full flex-row items-center justify-between px-2">
          <Tabs
            aria-label="Publish Tabs"
            selectedKey={pathname}
            variant="light"
            color="primary"
            // classNames={{
            //   tabList: 'gap-4 w-full p-2 bg-background',
            //   cursor: 'bg-primary/50',
            //   tab: 'w-fit px-4 h-fit hover:text-primary',
            //   tabContent: 'group-data-[selected=true]:text-primary',
            // }}
          >
            <Tab
              key="/dashboard/publish/dynamic"
              href="/dashboard/publish/dynamic"
              title={<MessageCircleHeartIcon />}
            />
            <Tab
              key="/dashboard/publish/video"
              href="/dashboard/publish/video"
              title={<VideoIcon />}
            />
            <Tab
              key="/dashboard/publish/podcast"
              href="/dashboard/publish/podcast"
              title={<PodcastIcon />}
            />
            <Tab
              key="https://md.multipost.app"
              href="https://md.multipost.app"
              title={<FileTextIcon />}
            />
          </Tabs>
          <div className="flex w-56 flex-row items-center justify-end gap-2">
            {/* TODO: 暂时隐藏余额功能 */}
            {/* <BalanceButtonClient size="sm" /> */}
            <Button
              as={Link}
              href="https://docs.multipost.app/docs/user-guide/contact-us"
              target="_blank"
              variant="flat"
              color="primary"
              size="sm"
              startContent={<MessageSquareIcon className="size-5" />}>
              {t('contactUs')}
            </Button>
          </div>
        </div>
        <Divider className="my-0.5" />
        <Spacer y={2} />
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-hidden">
        <div className="size-full overflow-y-auto px-1 scrollbar-none">{children}</div>
      </div>
    </div>
  );
}
