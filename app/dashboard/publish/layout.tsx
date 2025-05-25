'use client';

import { Tabs, Tab, addToast } from '@heroui/react';
import { MessageCircleHeartIcon, VideoIcon, FileTextIcon, PodcastIcon } from 'lucide-react';
import { usePathname } from 'next/navigation';
import ForceInstallExtension from '@/components/ForceInstallExtension';
import { useEffect } from 'react';
import { checkServiceStatus, funcGetPermission } from '@/lib/extension';
import { ActivityAlert } from '../components/ActivityAlert';
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

      <div className="mx-auto w-full">{children}</div>
      <ActivityAlert />
    </div>
  );
}
