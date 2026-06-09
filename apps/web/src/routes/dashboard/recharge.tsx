import { createFileRoute } from '@tanstack/react-router';

import { routeMeta } from '../../lib/seo';
import RechargePageClient from './recharge/-components/RechargePageClient';

export const Route = createFileRoute('/dashboard/recharge')({
  head: () => ({
    meta: routeMeta({
      title: 'Recharge | MultiPost',
      description: 'Recharge your MultiPost account credits and review credit usage.',
      robots: 'noindex, nofollow',
    }),
  }),
  component: RechargePage,
});

function RechargePage() {
  return <RechargePageClient />;
}
