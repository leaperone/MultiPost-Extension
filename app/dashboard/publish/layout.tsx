'use client';

import { Tabs, Tab, addToast, Spacer, Divider } from '@heroui/react';
import { MessageCircleHeartIcon, VideoIcon, FileTextIcon, PodcastIcon } from 'lucide-react';
import { usePathname } from 'next/navigation';
import ForceInstallExtension from '@/components/ForceInstallExtension';
import { useEffect } from 'react';
import { checkServiceStatus, funcGetPermission } from '@/lib/extension';
import { useRouter } from 'next/navigation';

export default function PublishLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    checkServiceStatus().then((status) => {
      if (!status) {
        addToast({
          title: '未检测到 MultiPost 扩展',
          description: '请先安装扩展',
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
    <div className="h-screen p-1">
      {process.env.NODE_ENV !== 'development' && <ForceInstallExtension />}

      <div className="flex w-full flex-row items-center justify-between">
        <Tabs
          aria-label="Publish Tabs"
          selectedKey={pathname}
          variant="underlined"
          classNames={{
            tabList: 'gap-4 w-full p-2 bg-background',
            cursor: 'bg-primary/50',
            tab: 'w-fit px-4 h-fit hover:text-primary',
            tabContent: 'group-data-[selected=true]:text-primary',
          }}>
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
      </div>
      <Divider className="my-0.5" />

      <Spacer y={2} />

      <div className="mx-auto w-full max-w-3xl overflow-y-auto">{children}</div>
    </div>
  );
}
