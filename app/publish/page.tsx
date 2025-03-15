'use client';

import { Tabs, Tab, Spacer } from '@heroui/react';
import { MessageCircleHeartIcon, VideoIcon, GridIcon, FileTextIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import React from 'react';
import { useTranslation } from '@/i18n/client';

import { Alert } from '@heroui/react';

import ForceInstallExtension from '@/components/ForceInstallExtension';
import HomePageHeader from '@/components/HomePage/Header';
import { funcGetPermission } from './common';
import { useEffect } from 'react';

const DynamicTab = dynamic(() => import('./components/DynamicTab'), {
  ssr: false,
});

const VideoTab = dynamic(() => import('./components/VideoTab'), {
  ssr: false,
});

const GridTab = dynamic(() => import('./components/GridTab'), {
  ssr: false,
});

export default function PublishPage() {
  const { t } = useTranslation('publish');

  useEffect(() => {
    funcGetPermission().then((res) => {
      if (res.status && res.status === 'confirm') {
        window.location.reload();
      } else if (res.trusted) {
        return true;
      }
      return false;
    });
  }, []);

  const handleArticleClick = () => {
    window.location.href = 'https://md.multipost.app';
  };

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
    {
      id: 'grid',
      label: t('tabs.grid'),
      icon: <GridIcon className="size-4" />,
      content: <GridTab />,
    },
    {
      id: 'article',
      label: t('tabs.article'),
      icon: <FileTextIcon className="size-4" />,
      content: null,
      onClick: handleArticleClick,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <HomePageHeader />
      <Spacer y={8} />
      {process.env.NODE_ENV !== 'development' && <ForceInstallExtension />}
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto w-full max-w-3xl">
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
                  <div
                    className="flex items-center gap-2"
                    onClick={tab.onClick}>
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
          className="mx-auto mt-4 max-w-xl">
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
