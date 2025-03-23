import { multipostDb } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import { Card, CardBody, CardHeader } from '@heroui/react';
import { Clock, Users, Eye } from 'lucide-react';
import { StatsCard } from './components/StatsCard';
import { ScriptModalButton } from './components/ScriptModalButton';
import { VisitTrendsChart } from './components/VisitTrendsChart';
import { getWebsiteStats, getVisitTrends, getPopularPages, getUserWebsites } from './actions';
import { auth } from '@/auth';
import { Prisma } from '@/prisma/client_multipost';
import { NoDataOverlay } from './components/NoDataOverlay';
import { WebsiteSelector } from './components/WebsiteSelector';

interface WebsitePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function WebsitePage(props: WebsitePageProps) {
  const params = await props.params;
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

  const [stats, trends, popularPages] = await Promise.all([
    getWebsiteStats(website.id),
    getVisitTrends(website.id),
    getPopularPages(website.id),
  ]);

  const totalPageviews = popularPages.reduce((acc, curr) => acc + curr.count, 0);

  const hasNoData = stats.pageviews.current === 0 && stats.visitors.current === 0;

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
        <div className={hasNoData ? 'pointer-events-none opacity-50' : ''}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatsCard
              title="实时访客"
              value={stats.visitors.current.toString()}
              change={`${stats.visitors.change >= 0 ? '+' : ''}${stats.visitors.change.toFixed(1)}%`}
              trend={stats.visitors.change >= 0 ? 'up' : 'down'}
              icon={<Users className="size-4" />}
            />
            <StatsCard
              title="今日浏览量"
              value={stats.pageviews.current.toString()}
              change={`${stats.pageviews.change >= 0 ? '+' : ''}${stats.pageviews.change.toFixed(1)}%`}
              trend={stats.pageviews.change >= 0 ? 'up' : 'down'}
              icon={<Eye className="size-4" />}
            />
            <StatsCard
              title="平均停留时间"
              value="2m 45s"
              change="-5%"
              trend="down"
              icon={<Clock className="size-4" />}
            />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <VisitTrendsChart data={trends} />

            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">热门页面</h2>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  {popularPages.map((page, i) => (
                    <div
                      key={page.urlPath}
                      className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="flex size-8 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-900">
                          {i + 1}
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{page.urlPath}</p>
                          <p className="text-xs text-gray-500">{page.count.toLocaleString()} 访问</p>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">{((page.count / totalPageviews) * 100).toFixed(1)}%</div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        </div>

        {hasNoData && <NoDataOverlay />}
      </div>
    </div>
  );
}
