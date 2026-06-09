import { createFileRoute } from '@tanstack/react-router';

import DesktopSettingsPage from '../../../../app/dashboard/desktop/settings/page';
import { routeMeta } from '../../../lib/seo';

export const Route = createFileRoute('/dashboard/desktop/settings')({
  head: () => ({
    meta: routeMeta({
      title: 'Desktop Settings | MultiPost',
      description: 'Configure MultiPost Desktop.',
      robots: 'noindex, nofollow',
    }),
  }),
  component: DesktopSettingsPage,
});
