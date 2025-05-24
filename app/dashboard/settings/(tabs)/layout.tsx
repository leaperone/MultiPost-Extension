'use client';

import { Tabs, Tab } from '@heroui/react';
import { ToggleRightIcon, KeyIcon, WalletIcon, ShieldCheckIcon, RouterIcon } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const baseUrl = '/dashboard/settings';

  return (
    <div className="flex h-screen w-full flex-col gap-4 p-2">
      <Tabs
        aria-label="Settings Options"
        color="primary"
        variant="underlined"
        selectedKey={pathname}
        classNames={{
          tabList: 'gap-4 w-full relative rounded-xl p-2 bg-default-100',
          cursor: 'bg-primary/20 shadow-md',
          tab: 'max-w-fit px-4 h-10 hover:text-primary',
          tabContent: 'group-data-[selected=true]:text-primary',
        }}>
        <Tab
          key={`${baseUrl}/general`}
          title={
            <div className="flex items-center space-x-2">
              <ToggleRightIcon className="size-4" />
              <span>General</span>
            </div>
          }
          href={`${baseUrl}/general`}
        />
        <Tab
          key={`${baseUrl}/api-keys`}
          title={
            <div className="flex items-center space-x-2">
              <KeyIcon className="size-4" />
              <span>API Keys</span>
            </div>
          }
          href={`${baseUrl}/api-keys`}
        />
        <Tab
          key={`${baseUrl}/credit-and-usage`}
          title={
            <div className="flex items-center space-x-2">
              <WalletIcon className="size-4" />
              <span>Credit & Usage</span>
            </div>
          }
          href={`${baseUrl}/credit-and-usage`}
        />
        <Tab
          key={`${baseUrl}/trust-domains`}
          title={
            <div className="flex items-center space-x-2">
              <ShieldCheckIcon className="size-4" />
              <span>Trust Domains</span>
            </div>
          }
          href={`${baseUrl}/trust-domains`}
        />
        <Tab
          key={`/dashboard/settings/client`}
          title={
            <div className="flex items-center space-x-2">
              <RouterIcon className="size-4" />
              <span>Clients</span>
            </div>
          }
          href={`/dashboard/settings/client`}
        />
      </Tabs>

      <div className="flex-1 overflow-y-auto scrollbar-hide">{children}</div>
    </div>
  );
}
