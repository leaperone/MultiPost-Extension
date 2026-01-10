'use client';

import Link from 'next/link';
import { ToggleRightIcon, KeyIcon, WalletIcon, ShieldCheckIcon, RouterIcon, UsersIcon } from 'lucide-react';
import { usePathname } from 'next/navigation';
import {
  LiquidGlassPageLayout,
  LiquidGlassTabs,
  LiquidGlassTab,
} from '@/components/ui/liquid-glass';

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
    <LiquidGlassPageLayout className="h-screen overflow-y-auto">
      {/* Tabs navigation */}
      <div className="sticky top-0 z-20 overflow-x-auto px-6 pb-4 pt-6 sm:px-8 lg:px-10">
        <LiquidGlassTabs className="w-max">
          {tabs.map((tab) => (
            <Link key={tab.key} href={tab.href}>
              <LiquidGlassTab isActive={pathname === tab.key || pathname.startsWith(tab.key)}>
                <div className="flex items-center gap-2">
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </div>
              </LiquidGlassTab>
            </Link>
          ))}
        </LiquidGlassTabs>
      </div>

      {/* Content area - no overflow hidden, let shadows breathe */}
      <div className="px-6 pb-8 sm:px-8 lg:px-10">{children}</div>
    </LiquidGlassPageLayout>
  );
}
