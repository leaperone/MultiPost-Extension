import React from 'react';
import ActivityList from './components/ActivityList';
import Header from '../(default)/components/Header';
import { Spacer } from '@heroui/react';
export default async function ActivityPage() {
  return (
    <div className="container mx-auto min-h-dvh py-8">
      <Header />
      <Spacer y={16} />
      <div className="flex flex-col items-center justify-center">
        <h1 className="mb-8 text-3xl font-bold">活动中心</h1>

        <ActivityList />
      </div>
    </div>
  );
}
