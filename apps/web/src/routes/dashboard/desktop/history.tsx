import { createFileRoute } from '@tanstack/react-router';

import DesktopHistoryPage from '../../../../app/dashboard/desktop/history/page';
import { routeMeta } from '../../../lib/seo';

export const Route = createFileRoute('/dashboard/desktop/history')({
  head: () => ({
    meta: routeMeta({
      title: 'Desktop History | MultiPost',
      description: 'Review MultiPost Desktop publishing history.',
      robots: 'noindex, nofollow',
    }),
  }),
  component: DesktopHistoryPage,
});
