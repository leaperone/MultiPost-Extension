'use client';

import {
  MessageCircleHeartIcon,
  VideoIcon,
  FileTextIcon,
  PodcastIcon,
  CalendarClockIcon,
  SparklesIcon,
  ArrowRightIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '@/i18n/client';
import { motion } from 'framer-motion';
import {
  LiquidGlassCard,
  LiquidGlassMotionCard,
  LiquidGlassIconContainer,
} from '@/components/ui/liquid-glass';
import { Chip } from '@heroui/react';

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
        icon: <MessageCircleHeartIcon className="size-10 sm:size-14" />,
        color: 'primary' as const,
      },
      {
        key: 'video',
        title: t('publishPage.publishTypes.video.title'),
        href: '/dashboard/publish/video',
        description: t('publishPage.publishTypes.video.description'),
        icon: <VideoIcon className="size-10 sm:size-14" />,
        color: 'warning' as const,
      },
      {
        key: 'podcast',
        title: t('publishPage.publishTypes.podcast.title'),
        href: '/dashboard/publish/podcast',
        description: t('publishPage.publishTypes.podcast.description'),
        icon: <PodcastIcon className="size-10 sm:size-14" />,
        color: 'secondary' as const,
      },
      {
        key: 'article',
        title: t('publishPage.publishTypes.article.title'),
        href: '/dashboard/md',
        description: t('publishPage.publishTypes.article.description'),
        icon: <FileTextIcon className="size-10 sm:size-14" />,
        color: 'success' as const,
      },
    ],
    [t],
  );

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
    <div className="flex min-h-[calc(100vh-120px)] flex-col items-center justify-center px-4 py-8">
      {/* Greeting */}
      <motion.div
        className="mb-8 text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}>
        <h1 className="text-2xl font-bold text-foreground/90 sm:text-3xl">
          {greeting}
          {session?.user?.name ? `，${session.user.name}` : ''}！
          <br />
          <span className="text-foreground/70">{t('publishPage.whatToWriteToday')}</span>
        </h1>
      </motion.div>

      {/* Feature Tips Banner */}
      <motion.div
        className="mb-8 flex w-full max-w-2xl flex-col gap-4 sm:flex-row"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}>
        <Link
          href="/dashboard/draw/image"
          className="flex-1">
          <LiquidGlassCard className="group h-full p-4 transition-all duration-300 hover:scale-[1.02]">
            <div className="flex flex-row items-center gap-4">
              <LiquidGlassIconContainer
                size="sm"
                color="warning">
                <SparklesIcon className="size-5" />
              </LiquidGlassIconContainer>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground/90">
                  {t('publishPage.featureTips.aiImage.title')}
                </h3>
                <p className="text-xs text-foreground/50">{t('publishPage.featureTips.aiImage.description')}</p>
              </div>
              <ArrowRightIcon className="size-4 text-foreground/40 transition-transform group-hover:translate-x-1" />
            </div>
          </LiquidGlassCard>
        </Link>

        <Link
          href="/dashboard/schedule"
          className="flex-1">
          <LiquidGlassCard className="group h-full p-4 transition-all duration-300 hover:scale-[1.02]">
            <div className="flex flex-row items-center gap-4">
              <LiquidGlassIconContainer
                size="sm"
                color="success">
                <CalendarClockIcon className="size-5" />
              </LiquidGlassIconContainer>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground/90">
                    {t('publishPage.featureTips.schedule.title')}
                  </h3>
                  <Chip
                    size="sm"
                    className="h-5 bg-green-500/20 text-xs text-green-600 dark:text-green-400">
                    {t('publishPage.featureTips.schedule.tag')}
                  </Chip>
                </div>
                <p className="text-xs text-foreground/50">{t('publishPage.featureTips.schedule.description')}</p>
              </div>
              <ArrowRightIcon className="size-4 text-foreground/40 transition-transform group-hover:translate-x-1" />
            </div>
          </LiquidGlassCard>
        </Link>
      </motion.div>

      {/* Publish Types Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8">
        {publishTypes.map((item, index) => (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}>
            <Link
              href={item.href}
              target={item.key === 'article' ? '_blank' : '_self'}>
              <LiquidGlassMotionCard className="group h-48 w-64 p-6 sm:p-8">
                <div className="flex h-full flex-col items-center justify-center gap-4">
                  <LiquidGlassIconContainer
                    size="lg"
                    color={item.color}
                    className="transition-transform duration-300 group-hover:scale-110">
                    {item.icon}
                  </LiquidGlassIconContainer>
                  <div className="space-y-1 text-center">
                    <h3 className="text-xl font-semibold text-foreground/90">{item.title}</h3>
                    <p className="text-sm text-foreground/50">{item.description}</p>
                  </div>
                </div>
              </LiquidGlassMotionCard>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
