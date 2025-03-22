'use client';

import { AnimatedList } from '@/components/magicui/animated-list';
import { Card } from '@heroui/react';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/client';

interface SocialPlatform {
  id: string;
  icon: string;
  color: string;
}

const PLATFORMS: SocialPlatform[] = [
  { id: 'facebook', icon: 'mdi:facebook', color: 'text-blue-600' },
  { id: 'bilibili', icon: 'simple-icons:bilibili', color: 'text-blue-500' },
  { id: 'wechat', icon: 'mdi:wechat', color: 'text-green-500' },
  { id: 'redbook', icon: 'simple-icons:xiaohongshu', color: 'text-red-500' },
  { id: 'tiktok', icon: 'ic:baseline-tiktok', color: 'text-black dark:text-white' },
  { id: 'douyin', icon: 'ic:baseline-tiktok', color: 'text-black dark:text-white' },
  { id: 'twitter', icon: 'mdi:twitter', color: 'text-sky-500' },
  { id: 'instagram', icon: 'mdi:instagram', color: 'text-pink-500' },
  { id: 'kuaishou', icon: 'simple-icons:kuaishou', color: 'text-orange-500' },
  { id: 'wechat_mp', icon: 'ri:wechat-channels-fill', color: 'text-green-600' },
];

interface NotificationProps {
  platform: SocialPlatform;
}

function Notification({ platform }: NotificationProps) {
  const { t } = useTranslation('notifications');

  return (
    <Card className="w-64 bg-background/80 p-3 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className={cn('rounded-full bg-background p-2', platform.color)}>
          <Icon
            icon={platform.icon}
            className="size-5"
          />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">{t('status.sent_to', { platform: t(`platforms.${platform.id}`) })}</p>
          <p className="text-xs text-foreground/60">{t('status.sync_success')}</p>
        </div>
      </div>
    </Card>
  );
}

export default function SocialShareNotifications() {
  return (
    <div className="fixed right-4 top-20 z-50">
      <AnimatedList
        delay={2500}
        loop={true}
        maxVisible={5}
        className="gap-3">
        {PLATFORMS.map((platform) => (
          <Notification
            key={platform.id}
            platform={platform}
          />
        ))}
      </AnimatedList>
    </div>
  );
}
