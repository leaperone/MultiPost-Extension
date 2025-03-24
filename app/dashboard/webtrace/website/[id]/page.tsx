import { multipostDb } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { auth } from '@/auth';
import { FirstTimeGuide } from './components/FirstTimeGuide';
import { WebsiteSelector } from './components/WebsiteSelector';
import { ScriptModalButton } from './components/ScriptModalButton';
import { VisitorsCard } from './components/VisitorsCard';
import { PageviewsCard } from './components/PageviewsCard';
import { TrendsCard } from './components/TrendsCard';
import { PopularPagesCard } from './components/PopularPagesCard';
import { getWebsites } from './actions';
import { DateRangeSelector } from './components/DateRangeSelector';
import { z } from 'zod';
import { SessionsCard } from './components/SessionsCard';

interface WebsitePageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: { [key: string]: string | string[] | undefined };
}

const schema = z.object({
  isFirstTime: z.boolean().default(false),
  startDate: z
    .date()
    .optional()
    .default(() => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)), // 默认7天前
  endDate: z
    .date()
    .optional()
    .default(() => new Date()),
});

function parseSearchParams(searchParams: { [key: string]: string | string[] | undefined }) {
  return schema.parse({
    isFirstTime: searchParams['first-time'] === 'true',
    startDate: searchParams.startDate ? new Date(parseInt(searchParams.startDate as string)) : undefined,
    endDate: searchParams.endDate ? new Date(parseInt(searchParams.endDate as string)) : undefined,
  });
}

export default async function WebsitePage(props: WebsitePageProps) {
  const [params, searchParams] = await Promise.all([props.params, Promise.resolve(props.searchParams)]);
  const { isFirstTime, startDate, endDate } = parseSearchParams(searchParams);
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/signin');
  }

  const website = await multipostDb.website.findFirst({
    where: {
      id: params.id,
      userId: session.user.id,
      deletedAt: null,
    },
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
  const websites = await getWebsites();

  return (
    <div className="mx-auto h-full max-w-7xl space-y-6 overflow-y-auto p-4">
      <div className="flex items-center justify-between">
        <WebsiteSelector
          websites={websites}
          currentWebsiteId={website.id}
        />
        <DateRangeSelector />
        <ScriptModalButton websiteId={website.id} />
      </div>

      <div className="relative">
        <div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Suspense fallback={<div className="h-24 animate-pulse rounded-lg bg-gray-100" />}>
              <VisitorsCard
                websiteId={website.id}
                startDate={startDate}
                endDate={endDate}
              />
            </Suspense>
            <Suspense fallback={<div className="h-24 animate-pulse rounded-lg bg-gray-100" />}>
              <SessionsCard
                websiteId={website.id}
                startDate={startDate}
                endDate={endDate}
              />
            </Suspense>
            <Suspense fallback={<div className="h-24 animate-pulse rounded-lg bg-gray-100" />}>
              <PageviewsCard
                websiteId={website.id}
                startDate={startDate}
                endDate={endDate}
              />
            </Suspense>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-1">
            <Suspense fallback={<div className="h-[400px] animate-pulse rounded-lg bg-gray-100" />}>
              <TrendsCard
                websiteId={website.id}
                startDate={startDate}
                endDate={endDate}
              />
            </Suspense>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Suspense fallback={<div className="h-[400px] animate-pulse rounded-lg bg-gray-100" />}>
              <TrendsCard
                websiteId={website.id}
                startDate={startDate}
                endDate={endDate}
              />
            </Suspense>

            <Suspense fallback={<div className="h-[400px] animate-pulse rounded-lg bg-gray-100" />}>
              <PopularPagesCard
                websiteId={website.id}
                startDate={startDate}
                endDate={endDate}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
