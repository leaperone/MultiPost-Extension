import { Button, Link, Skeleton, Card, CardBody } from '@heroui/react';
import { Suspense } from 'react';

import { auth } from '@/auth';
import { createTranslation } from '@/i18n/server';
import {
  SendIcon,
  FileTextIcon,
  ChartSplineIcon,
  ScanEyeIcon,
  SettingsIcon,
  PaletteIcon,
  MessageSquareIcon,
  PuzzleIcon,
} from 'lucide-react';
import { ActivityAlert } from './components/ActivityAlert';
import { BalanceButton } from './components/BalanceButton';

interface DashboardCardProps {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  external?: boolean;
}

function DashboardCard({ href, title, description, icon, external }: DashboardCardProps) {
  return (
    <Card
      as={Link}
      href={href}
      target={external ? '_blank' : undefined}
      isPressable
      className="group border shadow-none transition-all hover:scale-[1.01]">
      <CardBody className="flex flex-row items-start gap-4 p-6">
        <div className="rounded-lg bg-primary-50/80 p-2 dark:bg-primary-900/10">{icon}</div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-foreground/90">{title}</h3>
          <p className="text-sm text-foreground/60">{description}</p>
        </div>
      </CardBody>
    </Card>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user;

  const { t } = await createTranslation('dashboard');

  const cards = [
    {
      href: '/dashboard/publish',
      title: t('welcome.publish.title'),
      description: t('welcome.publish.description'),
      icon: <SendIcon className="size-5 text-primary-600 dark:text-primary-400" />,
    },
    {
      href: 'https://md.multipost.app',
      title: t('welcome.markdown.title'),
      description: t('welcome.markdown.description'),
      icon: <FileTextIcon className="size-5 text-primary-600 dark:text-primary-400" />,
      external: true,
    },
    {
      href: '/dashboard/analytics',
      title: t('welcome.analytics.title'),
      description: t('welcome.analytics.description'),
      icon: <ChartSplineIcon className="size-5 text-primary-600 dark:text-primary-400" />,
    },
    {
      href: '/dashboard/scraper',
      title: t('welcome.scraper.title'),
      description: t('welcome.scraper.description'),
      icon: <ScanEyeIcon className="size-5 text-primary-600 dark:text-primary-400" />,
    },
    {
      href: '/dashboard/draw',
      title: t('welcome.draw.title'),
      description: t('welcome.draw.description'),
      icon: <PaletteIcon className="size-5 text-primary-600 dark:text-primary-400" />,
    },
  ];

  return (
    <div className="mx-auto h-full max-w-7xl space-y-6 overflow-y-auto p-4">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="col-span-full space-y-4 md:col-span-3">
          <div className="flex flex-col items-center justify-between gap-2 md:flex-row">
            <h2 className="text-2xl font-bold">{t('welcome.title', { name: user?.name || 'Dear' })}</h2>
            <div className="flex items-center gap-4">
              <BalanceButton alert={1} />
              <Button
                as={Link}
                href="/dashboard/settings"
                isIconOnly
                variant="flat">
                <SettingsIcon />
              </Button>
              <Button
                as={Link}
                href="https://docs.multipost.app/docs/user-guide/contact-us"
                target="_blank"
                variant="flat"
                color="primary"
                startContent={<MessageSquareIcon className="size-5" />}>
                {t('welcome.contact_us')}
              </Button>
              <Button
                as={Link}
                href="/extension"
                variant="flat"
                color="secondary"
                startContent={<PuzzleIcon className="size-5" />}>
                {t('welcome.extension')}
              </Button>
            </div>
          </div>

          <ActivityAlert />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card, index) => (
              <DashboardCard
                key={index}
                {...card}
              />
            ))}
          </div>
          <Suspense fallback={<CardSkeleton />}></Suspense>
        </div>
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-lg bg-background/60 p-4 backdrop-blur-md dark:bg-default-100/50">
      <Skeleton className="rounded-lg">
        <div className="h-24 rounded-lg bg-default-300"></div>
      </Skeleton>
      <div className="space-y-3 pt-4">
        <Skeleton className="w-3/5 rounded-lg">
          <div className="h-3 w-3/5 rounded-lg bg-default-200"></div>
        </Skeleton>
        <Skeleton className="w-4/5 rounded-lg">
          <div className="h-3 w-4/5 rounded-lg bg-default-200"></div>
        </Skeleton>
        <Skeleton className="w-2/5 rounded-lg">
          <div className="h-3 w-2/5 rounded-lg bg-default-300"></div>
        </Skeleton>
      </div>
    </div>
  );
}
