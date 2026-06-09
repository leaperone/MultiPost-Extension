import { createFileRoute, redirect } from '@tanstack/react-router';

import { routeMeta } from '../../lib/seo';

export const Route = createFileRoute('/_default/on-install')({
  head: () => ({
    meta: routeMeta({
      title: 'Extension Installed - MultiPost',
      description:
        'Welcome to MultiPost browser extension. Get started with multi-platform publishing.',
    }),
  }),
  beforeLoad: () => {
    throw redirect({ href: '/', statusCode: 302 });
  },
});
