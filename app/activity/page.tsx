import React from 'react';
import { Metadata } from 'next';
import ActivityList from './components/ActivityList';
import Header from '../(default)/components/Header';
import { Spacer } from '@heroui/react';

export const metadata: Metadata = {
  title: '活动中心 | MultiPost',
  description: '参与 MultiPost 活动，完成任务获取免费余额奖励。查看最新的推广活动和奖励信息。',
};

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
