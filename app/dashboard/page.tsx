'use client';

import { Button, Link, Skeleton } from '@heroui/react';
import { Suspense } from 'react';
import { motion } from 'framer-motion';

import { useTranslation } from '@/i18n/client';
import {
  SendIcon,
  FileTextIcon,
  SettingsIcon,
  PaletteIcon,
  MessageSquareIcon,
  PuzzleIcon,
  SparklesIcon,
  BookOpenIcon,
  VideoIcon,
} from 'lucide-react';
import {
  LiquidGlassMotionCard,
  LiquidGlassButton,
  LiquidGlassIconContainer,
} from '@/components/ui/liquid-glass';

interface DashboardCardProps {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  iconColor?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'default';
  external?: boolean;
  index?: number;
}

function DashboardCard({ href, title, description, icon, iconColor = 'default', external, index = 0 }: DashboardCardProps) {
  return (
    <motion.a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5, ease: 'easeOut' }}>
      <LiquidGlassMotionCard
        className="group h-full cursor-pointer p-6 sm:p-8"
        variant="default">
        <div className="flex flex-col items-center gap-4 sm:gap-6">
          {/* Icon Container with glass effect */}
          <LiquidGlassIconContainer
            size="xl"
            color={iconColor}
            className="transition-transform duration-300 group-hover:scale-110">
            {icon}
          </LiquidGlassIconContainer>

          {/* Text Content */}
          <div className="space-y-2 text-center">
            <h3 className="text-lg font-semibold text-foreground/90 sm:text-xl">{title}</h3>
            <p className="text-sm text-foreground/50 sm:text-base">{description}</p>
          </div>
        </div>
      </LiquidGlassMotionCard>
    </motion.a>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation('dashboard');

  const cards = [
    {
      href: '/dashboard/publish',
      title: t('welcome.publish.title'),
      description: t('welcome.publish.description'),
      icon: <SendIcon className="size-10 text-blue-500 dark:text-blue-400 sm:size-14" />,
      iconColor: 'primary' as const,
    },
    {
      href: 'https://md.multipost.app',
      title: t('welcome.markdown.title'),
      description: t('welcome.markdown.description'),
      icon: <BookOpenIcon className="size-10 text-purple-500 dark:text-purple-400 sm:size-14" />,
      iconColor: 'secondary' as const,
      external: true,
    },
    {
      href: '/dashboard/drafts',
      title: t('welcome.drafts.title'),
      description: t('welcome.drafts.description'),
      icon: <FileTextIcon className="size-10 text-slate-500 dark:text-slate-400 sm:size-14" />,
      iconColor: 'default' as const,
    },
    {
      href: '/dashboard/draw',
      title: t('welcome.draw.title'),
      description: t('welcome.draw.description'),
      icon: <PaletteIcon className="size-10 text-pink-500 dark:text-pink-400 sm:size-14" />,
      iconColor: 'danger' as const,
    },
    {
      href: '/dashboard/video-transcribe',
      title: t('welcome.videoTranscribe.title'),
      description: t('welcome.videoTranscribe.description'),
      icon: <VideoIcon className="size-10 text-amber-500 dark:text-amber-400 sm:size-14" />,
      iconColor: 'warning' as const,
    },
  ];

  return (
    <div className="relative h-full overflow-y-auto">
      {/* Fixed Background */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('https://i.ibb.co/xtN61cRf/Comfy-UI-Output-4-1.png')",
        }}
      />

      {/* Fixed Semi-transparent overlay */}
      <div className="fixed inset-0 bg-white/60 backdrop-blur-xs dark:bg-black/60" />

      {/* Fixed Animated gradient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <motion.div
          className="absolute -left-32 -top-32 size-96 rounded-full bg-blue-400/20 blur-3xl dark:bg-blue-600/10"
          animate={{
            x: [0, 30, 0],
            y: [0, 20, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute -bottom-32 -right-32 size-96 rounded-full bg-purple-400/20 blur-3xl dark:bg-purple-600/10"
          animate={{
            x: [0, -30, 0],
            y: [0, -20, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        {/* Header Section */}
        <motion.div
          className="mb-8 sm:mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}>
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            {/* Welcome Title */}
            <div className="flex items-center gap-2">
              <SparklesIcon className="size-6 text-amber-500" />
              <h1 className="text-2xl font-bold text-foreground/90 sm:text-3xl">
                {t('welcome.title', { name: '' }).replace('，', '')}
              </h1>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <LiquidGlassButton
                onClick={() => window.open('/docs/user-guide/contact-us', '_blank')}
                className="flex items-center gap-2">
                <MessageSquareIcon className="size-4" />
                <span className="hidden sm:inline">{t('welcome.contact_us')}</span>
              </LiquidGlassButton>

              <LiquidGlassButton
                onClick={() => (window.location.href = '/extension')}
                className="flex items-center gap-2">
                <PuzzleIcon className="size-4" />
                <span className="hidden sm:inline">{t('welcome.extension')}</span>
              </LiquidGlassButton>

              <Link href="/dashboard/settings">
                <Button
                  isIconOnly
                  className="bg-white/20 backdrop-blur-xl dark:bg-white/10"
                  variant="flat"
                  radius="full">
                  <SettingsIcon className="size-5" />
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Cards Grid */}
        <Suspense fallback={<CardGridSkeleton />}>
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8">
            {cards.map((card, index) => (
              <DashboardCard
                key={card.href}
                {...card}
                index={index}
              />
            ))}
          </div>
        </Suspense>

        {/* Bottom Spacer */}
        <div className="h-8" />
      </div>
    </div>
  );
}

function CardGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="rounded-3xl border border-white/20 bg-white/15 p-6 backdrop-blur-xl dark:border-white/10 dark:bg-black/30 sm:p-8">
          <div className="flex flex-col items-center gap-4 sm:gap-6">
            <Skeleton className="size-24 rounded-full sm:size-32" />
            <div className="w-full space-y-2 text-center">
              <Skeleton className="mx-auto h-6 w-2/3 rounded-lg" />
              <Skeleton className="mx-auto h-4 w-4/5 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
