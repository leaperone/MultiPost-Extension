import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import React from 'react';
import { DashboardSidebar } from './components/SideBar';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { headers } from 'next/headers';
import { Metadata } from 'next';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';

export const metadata: Metadata = {
  title: 'Dashboard | MultiPost',
  description: 'MultiPost Dashboard',
};

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '/dashboard';

  if (!session) {
    redirect(`/signin?redirect=${encodeURIComponent(pathname)}`);
  }
  return (
    <div className="flex h-screen w-full overflow-y-hidden">
      <SidebarProvider defaultOpen={false}>
        <DashboardSidebar />
        <div className="flex-1">
          <div className="flex w-full justify-between sm:hidden md:hidden">
            <SidebarTrigger />
            <ThemeSwitcher isBlur={false} />
          </div>
          {children}
        </div>
      </SidebarProvider>
    </div>
  );
}
