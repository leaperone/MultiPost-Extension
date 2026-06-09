import { Spinner } from '@heroui/react';
import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense, useEffect, useState } from 'react';

import { routeMeta } from '../../../lib/seo';

const MdEditorClient = lazy(() => import('./-components/MdEditorClient'));

export const Route = createFileRoute('/dashboard/md/')({
  head: () => ({
    meta: routeMeta({
      title: 'Markdown Editor | MultiPost',
      description: 'Markdown editor for MultiPost drafts',
      robots: 'noindex, nofollow',
    }),
  }),
  component: MdPage,
});

function MdPageFallback() {
  return (
    <div className="flex h-full items-center justify-center">
      <Spinner />
    </div>
  );
}

function MdPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <MdPageFallback />;
  }

  return (
    <Suspense fallback={<MdPageFallback />}>
      <MdEditorClient />
    </Suspense>
  );
}
