import { Skeleton } from '@heroui/react';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { ArrowRight, Send } from 'lucide-react';

import { auth } from '@/auth';
import { createTranslation } from '@/i18n/server';

interface WelcomeCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  redirectUrl?: string;
}

function WelcomeCard({ title, description, icon, redirectUrl }: WelcomeCardProps) {
  return (
    <div className="flex items-start gap-4 rounded-lg bg-background/60 p-6 backdrop-blur-md transition-all hover:bg-background/80 dark:bg-default-100/50">
      <div className="rounded-lg bg-primary-100 p-2 dark:bg-primary-900/20">{icon}</div>
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-foreground/80">{description}</p>
      </div>
      {redirectUrl && (
        <a
          href={redirectUrl}
          className="ml-auto">
          <ArrowRight className="ml-auto text-foreground/50" />
        </a>
      )}
    </div>
  );
}

export default async function Dashboard() {
  const session = await auth();
  const user = session?.user;
  if (!user) {
    redirect('/signin');
  }

  const { t } = await createTranslation('dashboard');

  return (
    <div className="mx-auto h-full max-w-7xl space-y-6 overflow-y-auto p-4">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="col-span-full space-y-4 md:col-span-3">
          <h2 className="text-2xl font-bold">{t('welcome.title', { name: user.name || t('user') })}</h2>
          <p className="text-foreground/80">{t('welcome.description')}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <WelcomeCard
              title={t('welcome.publish.title')}
              description={t('welcome.publish.description')}
              icon={<Send className="size-5 text-primary" />}
              redirectUrl="/publish"
            />
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
