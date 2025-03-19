import { auth } from '@/auth';
import { multipostDb } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { EventList } from '../../components/event-list';
import { Card, CardBody, CardHeader, Skeleton } from '@heroui/react';

interface WebsitePageProps {
  params: {
    id: string;
  };
}

export default async function WebsitePage({ params }: WebsitePageProps) {
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

  return (
    <div className="mx-auto h-full max-w-7xl space-y-6 overflow-y-auto p-4">
      <Card>
        <CardHeader>
          <h1 className="text-2xl font-bold">{website.name}</h1>
          {website.domain && <p className="text-sm text-gray-500">{website.domain}</p>}
        </CardHeader>
        <CardBody>
          <div className="space-y-2">
            <p className="text-sm text-gray-500">创建于 {new Date(website.createdAt).toLocaleDateString()}</p>
          </div>
        </CardBody>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">最近事件</h2>
        <Suspense fallback={<EventListSkeleton />}>
          <EventList websiteId={website.id} />
        </Suspense>
      </div>
    </div>
  );
}

function EventListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardBody>
            <Skeleton className="h-4 w-full" />
            <div className="mt-2 space-y-1">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
