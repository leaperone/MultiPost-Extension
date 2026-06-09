import { createFileRoute } from '@tanstack/react-router';

import DesktopAccountsPage from '../../../../app/dashboard/desktop/accounts/page';
import { routeMeta } from '../../../lib/seo';

export const Route = createFileRoute('/dashboard/desktop/accounts')({
  head: () => ({
    meta: routeMeta({
      title: 'Desktop Accounts | MultiPost',
      description: 'Manage MultiPost Desktop social accounts.',
      robots: 'noindex, nofollow',
    }),
  }),
  component: DesktopAccountsPage,
});
