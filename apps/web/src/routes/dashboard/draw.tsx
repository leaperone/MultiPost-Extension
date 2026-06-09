import { Outlet, createFileRoute } from '@tanstack/react-router';

import { routeMeta } from '../../lib/seo';
import HeaderTabs from './draw/-components/Tabs';

export const Route = createFileRoute('/dashboard/draw')({
  head: () => ({
    meta: routeMeta({
      title: 'Draw | MultiPost',
      description: 'Generate images and posters in MultiPost',
      robots: 'noindex, nofollow',
    }),
  }),
  component: DrawLayout,
});

function DrawLayout() {
  return (
    <div className="flex h-screen w-full flex-col gap-4 overflow-hidden bg-background">
      <div className="sticky top-0 z-20 bg-background px-6 pb-2 pt-6 sm:px-8 lg:px-10">
        <HeaderTabs />
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <Outlet />
      </div>
    </div>
  );
}
