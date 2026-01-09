'use client';

import { Card, CardBody, CardHeader, Chip } from '@heroui/react';
import { MessageCircleHeartIcon, VideoIcon, FileTextIcon, PodcastIcon, CalendarClockIcon, SparklesIcon, ArrowRightIcon } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '@/i18n/client';

export default function PublishPage() {
  const { t } = useTranslation('publish');
  const { data: session } = useSession();

  const publishTypes = useMemo(
    () => [
      {
        key: 'dynamic',
        title: t('publishPage.publishTypes.dynamic.title'),
        href: '/dashboard/publish/dynamic',
        description: t('publishPage.publishTypes.dynamic.description'),
        icon: <MessageCircleHeartIcon className="size-10" />,
      },
      {
        key: 'video',
        title: t('publishPage.publishTypes.video.title'),
        href: '/dashboard/publish/video',
        description: t('publishPage.publishTypes.video.description'),
        icon: <VideoIcon className="size-10" />,
      },
      {
        key: 'podcast',
        title: t('publishPage.publishTypes.podcast.title'),
        href: '/dashboard/publish/podcast',
        description: t('publishPage.publishTypes.podcast.description'),
        icon: <PodcastIcon className="size-10" />,
      },
      {
        key: 'article',
        title: t('publishPage.publishTypes.article.title'),
        href: 'https://md.multipost.app',
        description: t('publishPage.publishTypes.article.description'),
        icon: <FileTextIcon className="size-10" />,
      },
    ],
    [t],
  );

  // Defer greeting calculation to client-side to prevent hydration mismatch
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting(t('publishPage.greeting.morning'));
    } else if (hour >= 12 && hour < 14) {
      setGreeting(t('publishPage.greeting.noon'));
    } else if (hour >= 14 && hour < 18) {
      setGreeting(t('publishPage.greeting.afternoon'));
    } else {
      setGreeting(t('publishPage.greeting.evening'));
    }
  }, [t]);

  return (
    <div className="flex h-full flex-col items-center justify-center">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold">
          {greeting}
          {session?.user?.name ? `，${session.user.name}` : ''}！
          <br />
          {t('publishPage.whatToWriteToday')}
        </h1>
      </div>

      {/* Feature Tips Banner */}
      <div className="mb-8 flex w-full max-w-2xl flex-col gap-3 sm:flex-row">
        <Link href="/dashboard/draw/image" className="flex-1">
          <Card className="group h-full border-none bg-gradient-to-r from-amber-500/10 to-orange-500/10 shadow-xs transition-all hover:shadow-md">
            <CardBody className="flex flex-row items-center gap-3 p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white">
                <SparklesIcon className="size-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground">{t('publishPage.featureTips.aiImage.title')}</h3>
                <p className="text-xs text-foreground/60">{t('publishPage.featureTips.aiImage.description')}</p>
              </div>
              <ArrowRightIcon className="size-4 text-foreground/40 transition-transform group-hover:translate-x-1" />
            </CardBody>
          </Card>
        </Link>
        <Link href="/dashboard/schedule" className="flex-1">
          <Card className="group h-full border-none bg-gradient-to-r from-green-500/10 to-emerald-500/10 shadow-xs transition-all hover:shadow-md">
            <CardBody className="flex flex-row items-center gap-3 p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 text-white">
                <CalendarClockIcon className="size-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{t('publishPage.featureTips.schedule.title')}</h3>
                  <Chip size="sm" color="success" variant="flat" className="h-5 text-xs">{t('publishPage.featureTips.schedule.tag')}</Chip>
                </div>
                <p className="text-xs text-foreground/60">{t('publishPage.featureTips.schedule.description')}</p>
              </div>
              <ArrowRightIcon className="size-4 text-foreground/40 transition-transform group-hover:translate-x-1" />
            </CardBody>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {publishTypes.map((item) => (
          <Link
            href={item.href}
            key={item.key}
            target={item.key === 'article' ? '_blank' : '_self'}>
            <Card
              className="h-48 w-64 p-4 hover:shadow-lg"
              isPressable>
              <CardHeader className="flex items-center gap-4">
                {item.icon}
                <h3 className="text-xl font-bold">{item.title}</h3>
              </CardHeader>
              <CardBody>
                <p className="text-gray-500">{item.description}</p>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
