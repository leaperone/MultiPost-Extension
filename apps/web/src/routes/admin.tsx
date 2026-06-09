import { createServerFn } from '@tanstack/react-start';
import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

import { routeMeta } from '../lib/seo';
import CompassLoader from './dashboard/-components/CompassLoader';

const emptySchema = z.object({});

const getAdminAccess = createServerFn({ method: 'GET' })
  .validator(emptySchema)
  .handler(async () => {
    const { getRequestHeaders } = await import('@tanstack/react-start/server');
    const cookieHeader = getRequestHeaders().get('cookie') ?? '';

    if (!hasBetterAuthSessionCookie(cookieHeader)) {
      return {
        authenticated: false,
        admin: false,
      };
    }

    const { getSession } = await import('../lib/session');
    const { isAdmin } = await import('../actions/admin');
    const session = await getSession();

    return {
      authenticated: Boolean(session?.user?.id),
      admin: Boolean(session?.user?.email && isAdmin(session.user.email)),
    };
  });

function hasBetterAuthSessionCookie(cookieHeader: string) {
  return /(?:^|;\s*)(?:__Secure-|__Host-)?better-auth[.-]session_token=/.test(
    cookieHeader,
  );
}

export const Route = createFileRoute('/admin')({
  beforeLoad: async ({ location }) => {
    const access = await getAdminAccess({ data: {} });

    if (!access.authenticated) {
      throw redirect({
        to: '/signin',
        search: {
          redirect: location.href,
        },
        statusCode: 302,
      });
    }

    if (!access.admin) {
      throw redirect({ href: '/', statusCode: 302 });
    }

    return access;
  },
  pendingComponent: AdminPending,
  head: () => ({
    meta: routeMeta({
      title: 'Admin | MultiPost',
      description: 'MultiPost admin console.',
      robots: 'noindex, nofollow',
    }),
  }),
  component: AdminLayout,
});

function AdminPending() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center">
      <CompassLoader />
    </div>
  );
}

function AdminLayout() {
  return (
    <main className="flex h-screen w-full overflow-y-auto bg-background">
      <Outlet />
    </main>
  );
}
