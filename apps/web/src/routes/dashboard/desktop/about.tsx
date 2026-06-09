import { createFileRoute } from '@tanstack/react-router';

import DesktopAboutPage from '../../../../app/dashboard/desktop/about/page';
import { routeMeta } from '../../../lib/seo';

export const Route = createFileRoute('/dashboard/desktop/about')({
  head: () => ({
    meta: routeMeta({
      title: 'Desktop About | MultiPost',
      description: 'MultiPost Desktop app information.',
      robots: 'noindex, nofollow',
    }),
  }),
  component: DesktopAboutPage,
});
