import { Outlet, createFileRoute } from '@tanstack/react-router';

import { routeMeta } from '../../../lib/seo';

export const Route = createFileRoute('/dashboard/desktop/publish')({
  head: () => ({
    meta: routeMeta({
      title: 'Desktop Publish | MultiPost',
      description: 'Publish content from MultiPost Desktop.',
      robots: 'noindex, nofollow',
    }),
  }),
  component: DesktopPublishLayout,
});

function DesktopPublishLayout() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
