import { Button, Link, Skeleton, Card, CardBody } from '@heroui/react';
import { Suspense } from 'react';

import { auth } from '@/auth';
import { createTranslation } from '@/i18n/server';
import {
  SendIcon,
  FileTextIcon,
  SettingsIcon,
  PaletteIcon,
  MessageSquareIcon,
  PuzzleIcon,
} from 'lucide-react';
// TODO: 暂时隐藏余额功能
// import { BalanceButton } from './components/BalanceButton';

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
      isBlurred
      className="bg-background-100/50 group border shadow-inner transition-all dark:border-none dark:bg-default-100/50">
      <CardBody className="grid grid-rows-4 gap-2 p-4 sm:gap-4 sm:p-6">
        <div className="row-span-3 m-auto">{icon}</div>
        <div className="mx-auto space-y-1 text-center">
          <h3 className="text-lg font-semibold text-foreground/80 sm:text-xl">{title}</h3>
          <p className="sm:text-md text-sm text-foreground/40">{description}</p>
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
      icon: <SendIcon className="size-20 text-primary-600 dark:text-primary-400 sm:size-32" />,
    },
    {
      href: 'https://md.multipost.app',
      title: t('welcome.markdown.title'),
      description: t('welcome.markdown.description'),
      icon: <FileTextIcon className="size-20 text-secondary-600 dark:text-secondary-400 sm:size-32" />,
      external: true,
    },
    {
      href: '/dashboard/drafts',
      title: t('welcome.drafts.title'),
      description: t('welcome.drafts.description'),
      icon: <FileTextIcon className="size-20 text-secondary-600 dark:text-secondary-400 sm:size-32" />,
    },
    {
      href: '/dashboard/draw',
      title: t('welcome.draw.title'),
      description: t('welcome.draw.description'),
      icon: <PaletteIcon className="size-20 text-danger-600 dark:text-danger-400 sm:size-32" />,
    },
  ];

  return (
    <div
      className="relative mx-auto h-full overflow-y-auto bg-cover bg-center bg-no-repeat p-4"
      style={{
        backgroundImage: "url('https://i.ibb.co/xtN61cRf/Comfy-UI-Output-4-1.png')",
      }}>
      {/* 添加半透明遮罩层以提高文字可读性 */}
      <div className="absolute inset-0 size-full bg-white/60 backdrop-blur-sm dark:bg-black/60"></div>

      <div className="relative z-10 mx-auto grid max-w-7xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="col-span-full space-y-4 md:col-span-3">
          <div className="flex flex-col items-center justify-between gap-2 md:flex-row">
            <h2 className="text-2xl font-bold">{t('welcome.title', { name: user?.name || 'Dear' })}</h2>
            <div className="flex max-w-sm flex-wrap items-center justify-center gap-4 sm:max-w-full sm:flex-row sm:flex-nowrap">
              {/* TODO: 暂时隐藏余额功能 */}
              {/* <BalanceButton alert={1} /> */}
              <Button
                as={Link}
                href="https://docs.multipost.app/docs/user-guide/contact-us"
                target="_blank"
                variant="flat"
                color="success"
                startContent={<MessageSquareIcon className="size-5" />}>
                {t('welcome.contact_us')}
              </Button>
              <Button
                as={Link}
                href="/extension"
                variant="flat"
                color="warning"
                startContent={<PuzzleIcon className="size-5" />}>
                {t('welcome.extension')}
              </Button>
              <Button
                as={Link}
                href="/dashboard/settings"
                isIconOnly
                variant="flat">
                <SettingsIcon />
              </Button>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 sm:gap-12 lg:grid-cols-3 lg:gap-16">
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
