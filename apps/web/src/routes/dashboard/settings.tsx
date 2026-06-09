import { Outlet, createFileRoute } from '@tanstack/react-router';

import { routeMeta } from '../../lib/seo';

export const Route = createFileRoute('/dashboard/settings')({
  head: () => ({
    meta: routeMeta({
      title: 'Settings | MultiPost',
      description: 'Settings for MultiPost',
      robots: 'noindex, nofollow',
    }),
  }),
  component: SettingsLayout,
});

function SettingsLayout() {
  return <Outlet />;
}
