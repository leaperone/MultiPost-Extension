'use client';

import { addToast } from '@heroui/react';
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
import {
  LiquidGlassPageLayout,
  LiquidGlassTabs,
  LiquidGlassTab,
  LiquidGlassButton,
} from '@/components/ui/liquid-glass';

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
      funcGetPermission().then(() => {});
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
      key: 'https://md.multipost.app',
      href: 'https://md.multipost.app',
      icon: <FileTextIcon className="size-5" />,
      external: true,
    },
  ];

  return (
    <LiquidGlassPageLayout className="h-screen overflow-y-auto">
      {process.env.NODE_ENV !== 'development' && <ForceInstallExtension />}

      {/* Header with tabs */}
      <div className="sticky top-0 z-20 px-6 pb-4 pt-6 sm:px-8 lg:px-10">
        <div className="flex w-full flex-row items-center justify-between gap-4">
          <LiquidGlassTabs>
            {tabs.map((tab) =>
              tab.external ? (
                <a key={tab.key} href={tab.href} target="_blank" rel="noopener noreferrer">
                  <LiquidGlassTab isActive={false}>{tab.icon}</LiquidGlassTab>
                </a>
              ) : (
                <Link key={tab.key} href={tab.href}>
                  <LiquidGlassTab isActive={pathname === tab.key}>{tab.icon}</LiquidGlassTab>
                </Link>
              ),
            )}
          </LiquidGlassTabs>

          <Link href="https://docs.multipost.app/docs/user-guide/contact-us" target="_blank">
            <LiquidGlassButton size="sm" variant="default">
              <MessageSquareIcon className="mr-2 size-4" />
              {t('contactUs')}
            </LiquidGlassButton>
          </Link>
        </div>
      </div>

      {/* Content area - no overflow hidden, let shadows breathe */}
      <div className="px-6 pb-8 sm:px-8 lg:px-10">{children}</div>
    </LiquidGlassPageLayout>
  );
}
