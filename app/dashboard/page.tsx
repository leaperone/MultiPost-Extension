import { Skeleton } from '@heroui/react';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { auth } from '@/auth';

export default async function Dashboard() {
  const session = await auth();
  const user = session?.user;
  if (!user) {
    redirect('/signin');
  }

  // If there is no username, redirect to the setting profile page
  // if (!user.username) {
  //   redirect('/dashboard/settings/profile');
  // }

  return (
    <div className="mx-auto h-full max-w-7xl space-y-6 overflow-y-auto p-4">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="col-span-full md:col-span-3">
          <Suspense fallback={<CardSkeleton />}></Suspense>
        </div>
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-lg bg-background/60 p-4 backdrop-blur-md dark:bg-default-100/50">
      <Skeleton className="rounded-lg">
        <div className="h-24 rounded-lg bg-default-300"></div>
      </Skeleton>
      <div className="space-y-3 pt-4">
        <Skeleton className="w-3/5 rounded-lg">
          <div className="h-3 w-3/5 rounded-lg bg-default-200"></div>
        </Skeleton>
        <Skeleton className="w-4/5 rounded-lg">
          <div className="h-3 w-4/5 rounded-lg bg-default-200"></div>
        </Skeleton>
        <Skeleton className="w-2/5 rounded-lg">
          <div className="h-3 w-2/5 rounded-lg bg-default-300"></div>
        </Skeleton>
      </div>
    </div>
  );
}
