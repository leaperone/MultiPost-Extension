'use client';

import { Tabs, Tab, Spacer } from '@heroui/react';
import { MessageCircleHeartIcon, VideoIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import React from 'react';
import { useTranslation } from '@/i18n/client';

import { Alert } from '@heroui/react';

import ForceInstallExtension from '@/components/ForceInstallExtension';
import HomePageHeader from '@/components/HomePage/Header';

const DynamicTab = dynamic(() => import('./components/DynamicTab'), {
  ssr: false,
});

const VideoTab = dynamic(() => import('./components/VideoTab'), {
  ssr: false,
});

export default function PublishPage() {
  const { t } = useTranslation('publish');

  const tabs = [
    {
      id: 'dynamic',
      label: t('tabs.dynamic'),
      icon: <MessageCircleHeartIcon className="size-4" />,
      content: <DynamicTab />,
    },
    {
      id: 'video',
      label: t('tabs.video'),
      icon: <VideoIcon className="size-4" />,
      content: <VideoTab />,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <HomePageHeader />
      <Spacer y={8} />
      {process.env.NODE_ENV !== 'development' && <ForceInstallExtension />}
      <div className="container mx-auto px-4 py-16">
        <div className="w-full max-w-3xl mx-auto">
          <Tabs
            aria-label="Content type tabs"
            isVertical
            variant="light"
            color="primary"
            defaultSelectedKey="dynamic"
            items={tabs}
            className="w-fit">
            {tabs.map((tab) => (
              <Tab
                key={tab.id}
                title={
                  <div className="flex items-center gap-2">
                    <p>{tab.icon}</p>
                    <p>{tab.label}</p>
                  </div>
                }
                className="w-full">
                {tab.content}
              </Tab>
            ))}
          </Tabs>
        </div>

        <Alert
          variant="flat"
          color="secondary"
          className="max-w-xl mx-auto mt-4">
          <div>
            {t('contact.message')}
            <Link
              href="mailto:support@leaper.one"
              className="text-blue-500 hover:underline">
              support@leaper.one
            </Link>{' '}
            {t('contact.or')}{' '}
            <Link
              href="https://github.com/leaper-one/Multipost-Extension/issues"
              className="text-blue-500 hover:underline">
              {t('contact.github')}
            </Link>{' '}
            {t('contact.page')}.
          </div>
        </Alert>
      </div>
    </div>
  );
}
