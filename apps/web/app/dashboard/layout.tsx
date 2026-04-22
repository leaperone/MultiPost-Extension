import { SidebarProvider } from '@/components/ui/sidebar';
import React, { CSSProperties } from 'react';
import { DashboardSidebar } from './components/SideBar';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { headers } from 'next/headers';
import { Metadata } from 'next';
import { TimezoneProvider } from './components/TimezoneProvider';
import { ToastProvider } from '@heroui/react';
import SupportBubble from '@/components/Support/SupportBubble';
import { isDesktopRequest } from '@/lib/desktop-detect';
import { DesktopSidebar } from '@/components/desktop/sidebar';
import { DesktopPathSync } from '@/components/desktop/path-sync';

export const metadata: Metadata = {
  title: 'Dashboard - Manage Your Social Media Publishing',
  description: 'Access your MultiPost dashboard to publish content, manage drafts, generate images, and track your social media presence across multiple platforms.',
};

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDesktop = await isDesktopRequest();

  if (isDesktop) {
    // Desktop 逻辑：无 auth，Desktop sidebar + 路径同步
    return (
      <div className="flex h-screen">
        <SidebarProvider
          defaultOpen={true}
          style={
            {
              '--sidebar-width': '12rem',
              '--sidebar-width-mobile': '12rem',
            } as CSSProperties
          }>
          <ToastProvider />
          <DesktopSidebar basePath="/dashboard" />
          <DesktopPathSync />
          <main className="flex-1 overflow-auto">{children}</main>
          <SupportBubble />
        </SidebarProvider>
      </div>
    );
  }

  // Web 逻辑：auth 校验 + Shadcn sidebar
  const session = await auth();
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '/dashboard';

  if (!session) {
    redirect(`/signin?redirect=${encodeURIComponent(pathname)}`);
  }
  return (
    <div className="flex h-screen">
      <SidebarProvider
        defaultOpen={true}
        style={
          {
            '--sidebar-width': '12rem',
            '--sidebar-width-mobile': '12rem',
          } as CSSProperties
        }>
        <ToastProvider />
        <DashboardSidebar />
        <TimezoneProvider />
        <main className="flex-1 overflow-hidden [transform:translateZ(0)]">{children}</main>
        <SupportBubble />
      </SidebarProvider>
    </div>
  );
}
