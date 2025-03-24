/**
 * @file Website analytics page
 */

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
import { BrowsersCard } from './components/BrowsersCard';
import { OsCard } from './components/OsCard';
import { DevicesCard } from './components/DevicesCard';
import { ReferrersCard } from './components/ReferrersCard';
import { getWebsites } from './actions';
import { DateRangeSelector } from './components/DateRangeSelector';
import { z } from 'zod';
import { SessionsCard } from './components/SessionsCard';

interface WebsitePageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/**
 * 将本地时间转换为 UTC 时间
 * @param localDate 本地时间
 * @returns UTC 时间
 */
function convertLocalToUTC(localDate: Date): Date {
  return new Date(localDate.getTime() - localDate.getTimezoneOffset() * 60 * 1000);
}

/**
 * 获取默认的开始时间（本地时间7天前的UTC时间）
 */
function getDefaultStartDate(): Date {
  const localDate = new Date();
  localDate.setDate(localDate.getDate() - 7);
  localDate.setHours(0, 0, 0, 0);
  return convertLocalToUTC(localDate);
}

/**
 * 获取默认的结束时间（本地时间今天23:59:59的UTC时间）
 */
function getDefaultEndDate(): Date {
  const localDate = new Date();
  localDate.setHours(23, 59, 59, 999);
  return convertLocalToUTC(localDate);
}

const schema = z.object({
  isFirstTime: z.boolean().default(false),
  startDate: z.date().optional().default(getDefaultStartDate),
  endDate: z.date().optional().default(getDefaultEndDate),
});

function parseSearchParams(searchParams: { [key: string]: string | string[] | undefined }) {
  const localStartDate = searchParams.startDate ? new Date(parseInt(searchParams.startDate as string)) : undefined;
  const localEndDate = searchParams.endDate ? new Date(parseInt(searchParams.endDate as string)) : undefined;

  return schema.parse({
    isFirstTime: searchParams['first-time'] === 'true',
    startDate: localStartDate ? convertLocalToUTC(localStartDate) : undefined,
    endDate: localEndDate ? convertLocalToUTC(localEndDate) : undefined,
  });
}

export default async function WebsitePage(props: WebsitePageProps) {
  const [params, searchParams] = await Promise.all([props.params, props.searchParams]);
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
              <ReferrersCard
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

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Suspense fallback={<div className="h-[400px] animate-pulse rounded-lg bg-gray-100" />}>
              <BrowsersCard
                websiteId={website.id}
                startDate={startDate}
                endDate={endDate}
              />
            </Suspense>

            <Suspense fallback={<div className="h-[400px] animate-pulse rounded-lg bg-gray-100" />}>
              <OsCard
                websiteId={website.id}
                startDate={startDate}
                endDate={endDate}
              />
            </Suspense>

            <Suspense fallback={<div className="h-[400px] animate-pulse rounded-lg bg-gray-100" />}>
              <DevicesCard
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
