import { Card } from '@heroui/react';
import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense, useEffect, useState } from 'react';

import { routeMeta } from '../../lib/seo';

const GridPageClient = lazy(() => import('./grid/-components/GridPageClient'));

export const Route = createFileRoute('/dashboard/grid')({
  head: () => ({
    meta: routeMeta({
      title: 'Grid | MultiPost',
      description: 'Split an image into a 3x3 social media grid in MultiPost.',
      robots: 'noindex, nofollow',
    }),
  }),
  component: GridPage,
});

function GridFallback() {
  return (
    <div className="h-screen overflow-y-auto bg-background p-6 sm:p-8 lg:p-10">
      <Card className="p-6" />
    </div>
  );
}

function GridPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <GridFallback />;
  }

  return (
    <Suspense fallback={<GridFallback />}>
      <GridPageClient />
    </Suspense>
  );
}
