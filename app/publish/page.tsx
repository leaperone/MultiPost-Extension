'use client';

import { Card, CardBody, Tabs, Tab, Spacer } from '@heroui/react';
import { MessageCircle } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import React from 'react';
import { useTranslation } from '@/i18n/client';

import ForceInstallExtension from '@/components/ForceInstallExtension';
import HomePageHeader from '@/components/HomePage/Header';

const DynamicTab = dynamic(() => import('./DynamicTab'), {
  ssr: false,
});

const VideoTab = dynamic(() => import('./VideoTab'), {
  ssr: false,
});

export default function PublishPage() {
  const { t } = useTranslation('publish');

  const tabs = [
    {
      id: 'dynamic',
      label: t('tabs.dynamic'),
      content: <DynamicTab />,
    },
    {
      id: 'video',
      label: t('tabs.video'),
      content: <VideoTab />,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <HomePageHeader />
      <Spacer y={8} />
      {process.env.NODE_ENV !== 'development' && <ForceInstallExtension />}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto mb-12 text-center">
          <h1 className="text-3xl font-semibold mb-4">{t('title')}</h1>
          <p className="text-foreground/80">{t('description')}</p>
        </div>

        <Card className="w-full max-w-2xl mx-auto bg-background/60 dark:bg-background/60 backdrop-blur-md border border-border/50">
          <CardBody className="p-6">
            <Tabs
              aria-label="Content type tabs"
              defaultSelectedKey="dynamic"
              items={tabs}
              className="w-full">
              {(item) => (
                <Tab
                  key={item.id}
                  title={item.label}>
                  {item.content}
                </Tab>
              )}
            </Tabs>
          </CardBody>
        </Card>

        <Card className="max-w-2xl mx-auto mt-4 bg-warning-50/50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-800">
          <CardBody className="flex flex-row items-center gap-2 p-4">
            <MessageCircle className="size-4 text-warning-800 dark:text-warning-500" />
            <p className="text-sm text-warning-800 dark:text-warning-500">
              {t('contact.message')}{' '}
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
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
