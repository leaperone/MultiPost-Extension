'use client';

import { addToast, Button } from '@heroui/react';
import {
  MessageCircleHeartIcon,
  VideoIcon,
  FileTextIcon,
  PodcastIcon,
  MessageSquareIcon,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import ForceInstallExtension from '@/components/ForceInstallExtension';
import { useEffect } from 'react';
import { checkServiceStatus, funcGetPermission } from '@/lib/extension';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/i18n/client';
import { cn } from '@/lib/utils';

export default function PublishLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation('publish');

  useEffect(() => {
    // Skip extension check in development mode
    if (process.env.NODE_ENV === 'development') return;

    checkServiceStatus().then((status) => {
      if (!status) {
        addToast({
          title: t('extensionNotDetected.title'),
          description: t('extensionNotDetected.description'),
        });
        router.push('/extension');
        return;
      }
      // Only timeouts reject here (resolves on any extension response, denied or not);
      // catch silences the unhandled rejection — Sentry already filters the matching timeout.
      funcGetPermission().catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tabs = [
    {
      key: '/dashboard/publish/dynamic',
      href: '/dashboard/publish/dynamic',
      icon: <MessageCircleHeartIcon className="size-5" />,
    },
    {
      key: '/dashboard/publish/video',
      href: '/dashboard/publish/video',
      icon: <VideoIcon className="size-5" />,
    },
    {
      key: '/dashboard/publish/podcast',
      href: '/dashboard/publish/podcast',
      icon: <PodcastIcon className="size-5" />,
    },
    {
      key: '/dashboard/md',
      href: '/dashboard/md',
      icon: <FileTextIcon className="size-5" />,
    },
  ];

  return (
    <div className="min-h-screen bg-background h-screen overflow-y-auto">
      {process.env.NODE_ENV !== 'development' && <ForceInstallExtension />}

      {/* Header with tabs */}
      <div className="sticky top-0 z-20 px-6 pb-4 pt-6 sm:px-8 lg:px-10">
        <div className="flex w-full flex-row items-center justify-between gap-4">
          <div className="inline-flex items-center gap-1 rounded-2xl border p-1">
            {tabs.map((tab) => (
              <Link key={tab.key} href={tab.href}>
                <button className={cn('inline-flex items-center justify-center whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200', pathname === tab.key ? 'bg-default-200 text-foreground shadow-sm' : 'text-foreground/60 hover:bg-default-100 hover:text-foreground')}>{tab.icon}</button>
              </Link>
            ))}
          </div>

          <Link href="/docs/user-guide/contact-us" target="_blank">
            <Button size="sm" variant="bordered">
              <MessageSquareIcon className="mr-2 size-4" />
              {t('contactUs')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Content area - no overflow hidden, let shadows breathe */}
      <div className="px-6 pb-8 sm:px-8 lg:px-10">{children}</div>
    </div>
  );
}
