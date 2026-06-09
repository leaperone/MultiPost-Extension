import { createFileRoute } from '@tanstack/react-router';

import { routeMeta } from '../../lib/seo';
import APIKeysPageClient from './api-keys/-components/APIKeysPageClient';

export const Route = createFileRoute('/dashboard/api-keys')({
  head: () => ({
    meta: routeMeta({
      title: 'API Keys | MultiPost',
      description: 'Manage API keys for MultiPost integrations.',
      robots: 'noindex, nofollow',
    }),
  }),
  component: APIKeysPage,
});

function APIKeysPage() {
  return <APIKeysPageClient />;
}
