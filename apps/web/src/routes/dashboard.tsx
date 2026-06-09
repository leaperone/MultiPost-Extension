import { createServerFn } from '@tanstack/react-start';
import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';
import { ToastProvider } from '@heroui/react';
import type { CSSProperties } from 'react';

import { SidebarProvider } from '@/components/ui/sidebar';
import { routeMeta } from '../lib/seo';
import { DashboardSidebar } from './dashboard/-components/DashboardSidebar';
import DashboardSupportBubble from './dashboard/-components/DashboardSupportBubble';
import { DesktopPathSync } from './dashboard/-components/DesktopPathSync';
import { DesktopSidebar } from './dashboard/-components/DesktopSidebar';
import { TimezoneProvider } from './dashboard/-components/TimezoneProvider';

const getDashboardAccess = createServerFn({ method: 'GET' }).handler(async () => {
  const { isDesktopRequest } = await import('../lib/desktop-detect');
  const isDesktop = await isDesktopRequest();

  if (isDesktop) {
    return {
      isDesktop: true,
      authenticated: true,
    };
  }

  const { getRequestHeaders } = await import('@tanstack/react-start/server');
  const cookieHeader = getRequestHeaders().get('cookie') ?? '';

  if (!hasBetterAuthSessionCookie(cookieHeader)) {
    return {
      isDesktop: false,
      authenticated: false,
    };
  }

  const { getSession } = await import('../lib/session');
  const session = await getSession();

  return {
    isDesktop: false,
    authenticated: Boolean(session?.user?.id),
  };
});

function hasBetterAuthSessionCookie(cookieHeader: string) {
  return /(?:^|;\s*)(?:__Secure-|__Host-)?better-auth[.-]session_token=/.test(
    cookieHeader,
  );
}

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async ({ location }) => {
    const access = await getDashboardAccess();

    if (!access.isDesktop && !access.authenticated) {
      throw redirect({
        to: '/signin',
        search: {
          redirect: location.href,
        },
        statusCode: 302,
      });
    }

    return access;
  },
  head: () => ({
    meta: routeMeta({
      title: 'Dashboard - Manage Your Social Media Publishing',
      description:
        'Access your MultiPost dashboard to publish content, manage drafts, generate images, and track your social media presence across multiple platforms.',
    }),
  }),
  component: DashboardLayout,
});

const sidebarStyle = {
  '--sidebar-width': '12rem',
  '--sidebar-width-mobile': '12rem',
} as CSSProperties;

function DashboardLayout() {
  const { isDesktop } = Route.useRouteContext();

  if (isDesktop) {
    return (
      <div className="flex h-screen">
        <SidebarProvider
          defaultOpen
          style={sidebarStyle}>
          <ToastProvider />
          <DesktopSidebar basePath="/dashboard" />
          <DesktopPathSync />
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
          <DashboardSupportBubble />
        </SidebarProvider>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <SidebarProvider
        defaultOpen
        style={sidebarStyle}>
        <ToastProvider />
        <DashboardSidebar />
        <TimezoneProvider />
        <main className="flex-1 overflow-hidden [transform:translateZ(0)]">
          <Outlet />
        </main>
        <DashboardSupportBubble />
      </SidebarProvider>
    </div>
  );
}
