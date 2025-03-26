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
import { WorldMap } from './components/WorldMap';
import { CountriesCard } from './components/CountriesCard';
import { CustomEventsCard } from './components/CustomEventsCard';
import { CustomEventChartCard } from './components/CustomEventChartCard';
import { cookies } from 'next/headers';
import DetailView from './components/DetailView';

interface WebsitePageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const getDefaultTimeRange = async () => {
  const cookieStore = await cookies();
  const timezone = cookieStore.get('timezone')?.value || 'Asia/Shanghai';

  const now = new Date();

  // 设置今天的结束时间 (23:59:59.999)，使用用户时区
  const endDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  endDate.setHours(23, 59, 59, 999);

  // 设置7天前的开始时间 (00:00:00.000)，使用用户时区
  const startDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  startDate.setDate(startDate.getDate() - 7);
  startDate.setHours(0, 0, 0, 0);

  return { startDate, endDate, timezone };
};

const schema = z.object({
  websiteId: z.string(),
  isFirstTime: z.boolean().default(false),
  startDate: z.date(),
  endDate: z.date(),
  timezone: z.string().default('Asia/Shanghai'),
  detail: z.string().optional(),
});

async function parseSearchParams(
  params: { id: string },
  searchParams: { [key: string]: string | string[] | undefined },
) {
  const { startDate: queryStartDate, endDate: queryEndDate } = searchParams;
  const defaultRange = await getDefaultTimeRange();

  return schema.parse({
    websiteId: params.id,
    isFirstTime: searchParams['first-time'] === 'true',
    startDate: queryStartDate ? new Date(parseInt(queryStartDate as string)) : defaultRange.startDate,
    endDate: queryEndDate ? new Date(parseInt(queryEndDate as string)) : defaultRange.endDate,
    timezone: defaultRange.timezone,
    detail: searchParams['detail'] as string | undefined,
  });
}

export default async function WebsitePage(props: WebsitePageProps) {
  const [params, searchParams] = await Promise.all([props.params, props.searchParams]);
  const parsedParams = await parseSearchParams(params, searchParams);
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

  if (parsedParams.isFirstTime) {
    return (
      <div className="mx-auto h-full max-w-7xl space-y-6 overflow-y-auto p-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <FirstTimeGuide websiteId={website.id} />
      </div>
    );
  }

  // 获取用户的所有网站
  const websites = await getWebsites();

  return (
    <div className="mx-auto h-full max-w-7xl space-y-6 overflow-y-auto p-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {/* 移动端响应式导航栏 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <WebsiteSelector
          websites={websites}
          currentWebsiteId={website.id}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <DateRangeSelector />
          <ScriptModalButton websiteId={website.id} />
        </div>
      </div>

      <div className="relative">
        <div>
          {/* 访客、会话和页面浏览统计卡片 - 在移动端堆叠显示 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            <Suspense fallback={<div className="h-24 animate-pulse rounded-lg bg-default-100" />}>
              <VisitorsCard {...parsedParams} />
            </Suspense>
            <Suspense fallback={<div className="h-24 animate-pulse rounded-lg bg-default-100" />}>
              <SessionsCard {...parsedParams} />
            </Suspense>
            <Suspense fallback={<div className="h-24 animate-pulse rounded-lg bg-default-100" />}>
              <PageviewsCard {...parsedParams} />
            </Suspense>
          </div>

          {/* 趋势图表 */}
          <div className="mt-4 grid gap-4">
            <Suspense fallback={<div className="h-[300px] animate-pulse rounded-lg bg-default-100 sm:h-[400px]" />}>
              <TrendsCard {...parsedParams} />
            </Suspense>
          </div>

          {parsedParams.detail ? (
            <div className="mt-4 grid grid-cols-1 gap-4">
              <Suspense fallback={<div className="h-[300px] animate-pulse rounded-lg bg-default-100 sm:h-[400px]" />}>
                <DetailView {...parsedParams} />
              </Suspense>
            </div>
          ) : (
            <>
              {/* 推荐来源和热门页面 */}
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Suspense fallback={<div className="h-[300px] animate-pulse rounded-lg bg-default-100 sm:h-[400px]" />}>
                  <ReferrersCard {...parsedParams} />
                </Suspense>

                <Suspense fallback={<div className="h-[300px] animate-pulse rounded-lg bg-default-100 sm:h-[400px]" />}>
                  <PopularPagesCard {...parsedParams} />
                </Suspense>
              </div>

              {/* 浏览器、操作系统和设备统计 */}
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Suspense fallback={<div className="h-[300px] animate-pulse rounded-lg bg-default-100 sm:h-[400px]" />}>
                  <BrowsersCard {...parsedParams} />
                </Suspense>

                <Suspense fallback={<div className="h-[300px] animate-pulse rounded-lg bg-default-100 sm:h-[400px]" />}>
                  <OsCard {...parsedParams} />
                </Suspense>

                <Suspense fallback={<div className="h-[300px] animate-pulse rounded-lg bg-default-100 sm:h-[400px]" />}>
                  <DevicesCard {...parsedParams} />
                </Suspense>
              </div>

              {/* 世界地图和国家统计 */}
              <div className="mt-4 grid gap-4">
                <Suspense fallback={<div className="h-[300px] animate-pulse rounded-lg bg-default-100 sm:h-[400px]" />}>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <WorldMap
                      className="col-span-1 md:col-span-2"
                      {...parsedParams}
                    />
                    <CountriesCard {...parsedParams} />
                  </div>
                </Suspense>
              </div>

              {/* 自定义事件 */}
              <div className="mt-4 grid gap-4">
                <Suspense fallback={<div className="h-[300px] animate-pulse rounded-lg bg-default-100 sm:h-[400px]" />}>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <CustomEventsCard {...parsedParams} />
                    <CustomEventChartCard
                      className="col-span-1 md:col-span-2"
                      {...parsedParams}
                    />
                  </div>
                </Suspense>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
