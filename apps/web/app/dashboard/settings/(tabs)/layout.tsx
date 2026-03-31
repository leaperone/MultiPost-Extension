'use client';

import Link from 'next/link';
import { ToggleRightIcon, KeyIcon, WalletIcon, ShieldCheckIcon, RouterIcon, UsersIcon } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const baseUrl = '/dashboard/settings';

  const tabs = [
    {
      key: `${baseUrl}/general`,
      href: `${baseUrl}/general`,
      label: 'General',
      icon: <ToggleRightIcon className="size-4" />,
    },
    {
      key: `${baseUrl}/api-keys`,
      href: `${baseUrl}/api-keys`,
      label: 'API Keys',
      icon: <KeyIcon className="size-4" />,
    },
    {
      key: `${baseUrl}/credit-and-usage`,
      href: `${baseUrl}/credit-and-usage`,
      label: 'Credit & Usage',
      icon: <WalletIcon className="size-4" />,
    },
    {
      key: `${baseUrl}/trust-domains`,
      href: `${baseUrl}/trust-domains`,
      label: 'Trust Domains',
      icon: <ShieldCheckIcon className="size-4" />,
    },
    {
      key: `${baseUrl}/client`,
      href: `${baseUrl}/client`,
      label: 'Clients',
      icon: <RouterIcon className="size-4" />,
    },
    {
      key: `${baseUrl}/social-media-accounts`,
      href: `${baseUrl}/social-media-accounts`,
      label: 'Social Media Accounts',
      icon: <UsersIcon className="size-4" />,
    },
  ];

  return (
    <div className="h-screen overflow-y-auto bg-background">
      {/* Tabs navigation */}
      <div className="sticky top-0 z-20 overflow-x-auto bg-background px-6 pb-4 pt-6 sm:px-8 lg:px-10">
        <div className="flex w-max gap-1 rounded-xl bg-default-100 p-1">
          {tabs.map((tab) => {
            const isActive = pathname === tab.key || pathname.startsWith(tab.key);
            return (
              <Link key={tab.key} href={tab.href}>
                <button
                  className={cn(
                    'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                    isActive ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
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

      {/* Content area */}
      <div className="px-6 pb-8 sm:px-8 lg:px-10">{children}</div>
    </div>
  );
}
