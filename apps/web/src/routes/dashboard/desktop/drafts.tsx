import { createFileRoute } from '@tanstack/react-router';

import DesktopDraftsPage from '../../../../app/dashboard/desktop/drafts/page';
import { routeMeta } from '../../../lib/seo';

export const Route = createFileRoute('/dashboard/desktop/drafts')({
  head: () => ({
    meta: routeMeta({
      title: 'Desktop Drafts | MultiPost',
      description: 'Manage MultiPost Desktop drafts.',
      robots: 'noindex, nofollow',
    }),
  }),
  component: DesktopDraftsPage,
});
