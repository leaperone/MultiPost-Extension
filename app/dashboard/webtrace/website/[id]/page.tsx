import { multipostDb } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { auth } from '@/auth';
import { Prisma } from '@/prisma/client_multipost';
import { FirstTimeGuide } from './components/FirstTimeGuide';
import { WebsiteSelector } from './components/WebsiteSelector';
import { ScriptModalButton } from './components/ScriptModalButton';
import { VisitorsCard } from './components/VisitorsCard';
import { PageviewsCard } from './components/PageviewsCard';
import { TrendsCard } from './components/TrendsCard';
import { PopularPagesCard } from './components/PopularPagesCard';
import { getUserWebsites } from './actions';

interface WebsitePageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function WebsitePage(props: WebsitePageProps) {
  const [params, searchParams] = await Promise.all([props.params, props.searchParams]);
  const isFirstTime = searchParams['first-time'] === 'true';
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/signin');
  }

  const where: Prisma.WebsiteWhereInput = {
    id: params.id,
    deletedAt: null,
  };

  if (process.env.NODE_ENV === 'production') {
    where.userId = session.user.id;
  }

  const website = await multipostDb.website.findFirst({
    where,
  });

  if (!website) {
    notFound();
  }

  if (isFirstTime) {
    return (
      <div className="mx-auto h-full max-w-7xl space-y-6 overflow-y-auto p-4">
        <FirstTimeGuide websiteId={website.id} />
      </div>
    );
  }

  // 获取用户的所有网站
  const websites = await getUserWebsites(session.user.id);

  return (
    <div className="mx-auto h-full max-w-7xl space-y-6 overflow-y-auto p-4">
      <div className="flex items-center justify-between">
        <WebsiteSelector
          websites={websites}
          currentWebsiteId={website.id}
        />
        <ScriptModalButton websiteId={website.id} />
      </div>

      <div className="relative">
        <div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Suspense fallback={<div className="h-24 animate-pulse rounded-lg bg-gray-100" />}>
              <VisitorsCard websiteId={website.id} />
            </Suspense>
            <Suspense fallback={<div className="h-24 animate-pulse rounded-lg bg-gray-100" />}>
              <PageviewsCard websiteId={website.id} />
            </Suspense>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Suspense fallback={<div className="h-[400px] animate-pulse rounded-lg bg-gray-100" />}>
              <TrendsCard websiteId={website.id} />
            </Suspense>

            <Suspense fallback={<div className="h-[400px] animate-pulse rounded-lg bg-gray-100" />}>
              <PopularPagesCard websiteId={website.id} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
