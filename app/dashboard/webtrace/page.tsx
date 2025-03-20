'use client';
import { CreateWebsiteButton } from './components/create-website-button';
import { WebsiteList } from './components/website-list';

export default function WebTracePage() {
  return (
    <div className="mx-auto h-full max-w-7xl space-y-6 overflow-y-auto p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">WebTrace</h1>
        <CreateWebsiteButton />
      </div>

      <div className="grid gap-6">
        <div className="col-span-full">
          <WebsiteList />
        </div>
      </div>
    </div>
  );
}
