import { createFileRoute, redirect } from '@tanstack/react-router';

import { routeMeta } from '../../../lib/seo';

export const Route = createFileRoute('/dashboard/drafts/')({
  head: () => ({
    meta: routeMeta({
      title: 'Drafts | MultiPost',
      description: 'Drafts for MultiPost',
      robots: 'noindex, nofollow',
    }),
  }),
  beforeLoad: () => {
    throw redirect({
      to: '/dashboard/md',
      statusCode: 302,
    });
  },
});
