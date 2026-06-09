import { createServerFn } from '@tanstack/react-start';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

import { routeMeta } from '../../lib/seo';
import FacebookPagesSelector, {
  type FacebookSelectablePage,
} from './facebook/-FacebookPagesSelector';

const emptySchema = z.object({});

const getAccountSession = createServerFn({ method: 'GET' })
  .validator(emptySchema)
  .handler(async () => {
    const { getRequestHeaders } = await import('@tanstack/react-start/server');
    const cookieHeader = getRequestHeaders().get('cookie') ?? '';

    if (!hasBetterAuthSessionCookie(cookieHeader)) {
      return {
        authenticated: false,
      };
    }

    const { getSession } = await import('../../lib/session');
    const session = await getSession();

    return {
      authenticated: Boolean(session?.user?.id),
    };
  });

function hasBetterAuthSessionCookie(cookieHeader: string) {
  return /(?:^|;\s*)(?:__Secure-|__Host-)?better-auth[.-]session_token=/.test(
    cookieHeader,
  );
}

export const Route = createFileRoute('/account/facebook')({
  beforeLoad: async ({ location }) => {
    const session = await getAccountSession({ data: {} });
    if (!session.authenticated) {
      throw redirect({
        to: '/signin',
        search: {
          redirect: location.href,
        },
        statusCode: 302,
      });
    }
  },
  loader: async () => {
    const { fetchFacebookPagesFromSession } = await import(
      '../../actions/social-media-accounts/facebook-pages'
    );
    const { account, pages } = await fetchFacebookPagesFromSession();

    if (!account) {
      throw redirect({
        to: '/dashboard/settings/social-media-accounts',
        search: { error: 'facebook_session_expired' },
        statusCode: 302,
      });
    }

    const selectablePages: FacebookSelectablePage[] = pages.map((page) => ({
      id: page.id,
      name: page.name,
      category: page.category,
      username: page.username,
      tasks: page.tasks,
    }));

    return { pages: selectablePages };
  },
  head: () => ({
    meta: routeMeta({
      title: 'Facebook Account - MultiPost',
      description: 'Connect and manage your Facebook account with MultiPost.',
      robots: 'noindex, nofollow',
    }),
  }),
  component: FacebookPagesSelectionPage,
});

function FacebookPagesSelectionPage() {
  const { pages } = Route.useLoaderData();

  return <FacebookPagesSelector pages={pages} />;
}
