import { SidebarProvider } from '@/components/ui/sidebar';
import React from 'react';
import { DashboardSidebar } from './SideBar';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { headers } from 'next/headers';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard | MultiPost',
  description: 'MultiPost Dashboard',
}

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const headersList = headers();
  const pathname = headersList.get('x-pathname') || '/dashboard';

  if (!session) {
    redirect(`/signin?redirect=${encodeURIComponent(pathname)}`);
  }
  return (
    <div className="flex h-screen w-full overflow-y-hidden">
      <SidebarProvider defaultOpen={false}>
        <DashboardSidebar />
        <div className="flex-1">{children}</div>
      </SidebarProvider>
    </div>
  );
}
