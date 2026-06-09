import { createFileRoute } from '@tanstack/react-router';

import DesktopExecutorPage from '../../../../app/dashboard/desktop/executor/page';
import { routeMeta } from '../../../lib/seo';

export const Route = createFileRoute('/dashboard/desktop/executor')({
  head: () => ({
    meta: routeMeta({
      title: 'Desktop Executor | MultiPost',
      description: 'Track MultiPost Desktop publishing progress.',
      robots: 'noindex, nofollow',
    }),
  }),
  component: DesktopExecutorPage,
});
