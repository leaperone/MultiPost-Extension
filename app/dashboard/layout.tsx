import { SidebarProvider } from '@/components/ui/sidebar';
import React, { CSSProperties } from 'react';
import { DashboardSidebar } from './components/SideBar';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { headers } from 'next/headers';
import { Metadata } from 'next';
// import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { TimezoneProvider } from './components/TimezoneProvider';
import { ToastProvider } from '@heroui/react';

export const metadata: Metadata = {
  title: 'Dashboard - Manage Your Social Media Publishing',
  description: 'Access your MultiPost dashboard to publish content, manage drafts, generate images, and track your social media presence across multiple platforms.',
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
        <main className="flex-1 overflow-hidden">{children}</main>
      </SidebarProvider>
    </div>
  );
}
