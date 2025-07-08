'use client';

import { Card, CardBody, CardHeader } from '@heroui/react';
import { MessageCircleHeartIcon, VideoIcon, FileTextIcon, PodcastIcon } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useMemo } from 'react';
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return t('publishPage.greeting.morning');
    }
    if (hour >= 12 && hour < 14) {
      return t('publishPage.greeting.noon');
    }
    if (hour >= 14 && hour < 18) {
      return t('publishPage.greeting.afternoon');
    }
    return t('publishPage.greeting.evening');
  };

  const greeting = useMemo(() => getGreeting(), [t]);

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
