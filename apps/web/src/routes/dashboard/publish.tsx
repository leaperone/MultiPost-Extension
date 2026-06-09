import { addToast, Button } from '@heroui/react';
import { Link, Outlet, createFileRoute, useLocation, useNavigate } from '@tanstack/react-router';
import {
  FileTextIcon,
  MessageCircleHeartIcon,
  MessageSquareIcon,
  PodcastIcon,
  VideoIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

import { checkServiceStatus, funcGetPermission } from '@/lib/extension';
import { cn } from '@/lib/utils';
import { useTranslation } from '../../i18n/client';
import ForceInstallExtension from './publish/-components/ForceInstallExtension';

export const Route = createFileRoute('/dashboard/publish')({
  component: PublishLayout,
});

const tabs: Array<{
  key: string;
  to: string;
  icon: ReactNode;
}> = [
  {
    key: '/dashboard/publish/dynamic',
    to: '/dashboard/publish/dynamic',
    icon: <MessageCircleHeartIcon className="size-5" />,
  },
  {
    key: '/dashboard/publish/video',
    to: '/dashboard/publish/video',
    icon: <VideoIcon className="size-5" />,
  },
  {
    key: '/dashboard/publish/podcast',
    to: '/dashboard/publish/podcast',
    icon: <PodcastIcon className="size-5" />,
  },
  {
    key: '/dashboard/md',
    to: '/dashboard/md',
    icon: <FileTextIcon className="size-5" />,
  },
];

function PublishLayout() {
  const pathname = useLocation({
    select: (location) => location.pathname,
  });
  const navigate = useNavigate();
  const { t } = useTranslation('publish');

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') return;

    checkServiceStatus().then((status) => {
      if (!status) {
        addToast({
          title: t('extensionNotDetected.title'),
          description: t('extensionNotDetected.description'),
        });
        void navigate({ to: '/extension' } as never);
        return;
      }

      funcGetPermission().catch(() => {});
    });
  }, [navigate, t]);

  return (
    <div className="h-screen min-h-screen overflow-y-auto bg-background">
      {process.env.NODE_ENV !== 'development' && <ForceInstallExtension />}

      <div className="sticky top-0 z-20 px-6 pb-4 pt-6 sm:px-8 lg:px-10">
        <div className="flex w-full flex-row items-center justify-between gap-4">
          <div className="inline-flex items-center gap-1 rounded-2xl border p-1">
            {tabs.map((tab) => (
              <Link
                key={tab.key}
                to={tab.to}>
                <button
                  type="button"
                  className={cn(
                    'inline-flex items-center justify-center whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200',
                    pathname === tab.key
                      ? 'bg-default-200 text-foreground shadow-sm'
                      : 'text-foreground/60 hover:bg-default-100 hover:text-foreground',
                  )}>
                  {tab.icon}
                </button>
              </Link>
            ))}
          </div>

          <a
            href="/docs/user-guide/contact-us"
            target="_blank"
            rel="noreferrer">
            <Button
              size="sm"
              variant="bordered">
              <MessageSquareIcon className="mr-2 size-4" />
              {t('contactUs')}
            </Button>
          </a>
        </div>
      </div>

      <div className="px-6 pb-8 sm:px-8 lg:px-10">
        <Outlet />
      </div>
    </div>
  );
}
