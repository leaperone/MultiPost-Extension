'use client';

import { Tabs, Tab } from '@heroui/react';
import { MessageCircleHeartIcon, VideoIcon, FileTextIcon, RouterIcon, PodcastIcon } from 'lucide-react';
import { usePathname } from 'next/navigation';
import ForceInstallExtension from '@/components/ForceInstallExtension';
import { useEffect } from 'react';
import { funcGetPermission } from '@/lib/extension';

export default function PublishLayout({ children }: { children: React.ReactNode }) {
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
        <Tab
          key="/dashboard/publish/client"
          href="/dashboard/publish/client"
          title={<RouterIcon />}
        />
      </Tabs>

      <div className="mx-auto w-full">{children}</div>
    </div>
  );
}
