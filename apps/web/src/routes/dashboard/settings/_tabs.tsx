import { Link, Outlet, createFileRoute, useLocation } from '@tanstack/react-router';
import {
  KeyIcon,
  RouterIcon,
  ShieldCheckIcon,
  ToggleRightIcon,
  UsersIcon,
  WalletIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export const Route = createFileRoute('/dashboard/settings/_tabs')({
  component: SettingsTabsLayout,
});

const baseUrl = '/dashboard/settings';

const tabs: Array<{
  key: string;
  to:
    | '/dashboard/settings/general'
    | '/dashboard/settings/api-keys'
    | '/dashboard/settings/credit-and-usage'
    | '/dashboard/settings/trust-domains'
    | '/dashboard/settings/client'
    | '/dashboard/settings/social-media-accounts';
  label: string;
  icon: ReactNode;
}> = [
  {
    key: `${baseUrl}/general`,
    to: '/dashboard/settings/general',
    label: 'General',
    icon: <ToggleRightIcon className="size-4" />,
  },
  {
    key: `${baseUrl}/api-keys`,
    to: '/dashboard/settings/api-keys',
    label: 'API Keys',
    icon: <KeyIcon className="size-4" />,
  },
  {
    key: `${baseUrl}/credit-and-usage`,
    to: '/dashboard/settings/credit-and-usage',
    label: 'Credit & Usage',
    icon: <WalletIcon className="size-4" />,
  },
  {
    key: `${baseUrl}/trust-domains`,
    to: '/dashboard/settings/trust-domains',
    label: 'Trust Domains',
    icon: <ShieldCheckIcon className="size-4" />,
  },
  {
    key: `${baseUrl}/client`,
    to: '/dashboard/settings/client',
    label: 'Clients',
    icon: <RouterIcon className="size-4" />,
  },
  {
    key: `${baseUrl}/social-media-accounts`,
    to: '/dashboard/settings/social-media-accounts',
    label: 'Social Media Accounts',
    icon: <UsersIcon className="size-4" />,
  },
];

function SettingsTabsLayout() {
  const pathname = useLocation({
    select: (location) => location.pathname,
  });

  return (
    <div className="h-screen overflow-y-auto bg-background">
      <div className="sticky top-0 z-20 overflow-x-auto bg-background px-6 pb-4 pt-6 sm:px-8 lg:px-10">
        <div className="flex w-max gap-1 rounded-xl bg-default-100 p-1">
          {tabs.map((tab) => {
            const isActive = pathname === tab.key || pathname.startsWith(`${tab.key}/`);

            return (
              <Link
                key={tab.key}
                to={tab.to}>
                <button
                  type="button"
                  className={cn(
                    'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-background shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}>
                  <div className="flex items-center gap-2">
                    {tab.icon}
                    <span className="hidden sm:inline">{tab.label}</span>
                  </div>
                </button>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="px-6 pb-8 sm:px-8 lg:px-10">
        <Outlet />
      </div>
    </div>
  );
}
