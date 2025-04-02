import { Suspense } from 'react';
import { CreateWebsiteButton } from './components/CreateWebsiteButton';
import { InfoButton } from './components/InfoButton';
import { WebsiteList } from './components/WebsitesList';
import LinkSocialMediaButton from './components/LinkSocialMediaButton';
import { Divider } from '@heroui/react';
export default async function AnalyticsPage() {
  return (
    <div className="mx-auto h-full max-w-7xl space-y-6 overflow-y-auto p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Analytics</h1>
          <InfoButton />
        </div>
        <div className="flex flex-row gap-2">
          <LinkSocialMediaButton />
          <CreateWebsiteButton />
        </div>
      </div>

      <div className="flex flex-row justify-between gap-8">
        <div className="w-1/2">
          <Suspense fallback={<WebsiteListSkeleton />}>
            <h2 className="mb-4 text-lg font-semibold">Your Websites</h2>
            <WebsiteList />
          </Suspense>
        </div>
        <Divider
          orientation="vertical"
          className="h-full"
        />
        <div className="w-1/2">
          <Suspense fallback={<WebsiteListSkeleton />}>
            <h2 className="mb-4 text-lg font-semibold">Your Social Media</h2>
            WIP...
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function WebsiteListSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(3)].map((_, index) => (
        <div
          key={index}
          className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <div className="mb-4 flex items-center gap-2">
            <div className="size-5 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-6 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-4 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          </div>
        </div>
      ))}
    </div>
  );
}
