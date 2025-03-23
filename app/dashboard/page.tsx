import { Button, Link, Skeleton } from '@heroui/react';
import { Suspense } from 'react';
import { Icon } from '@iconify/react';

import { auth } from '@/auth';
import { createTranslation } from '@/i18n/server';
import { SendIcon, FileTextIcon, ChartSplineIcon } from 'lucide-react';
import { HoverCard } from './components/HoverCard';

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user;

  const { t } = await createTranslation('dashboard');

  return (
    <div className="mx-auto h-full max-w-7xl space-y-6 overflow-y-auto p-4">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="col-span-full space-y-4 md:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">{t('welcome.title', { name: user?.name || 'Dear' })}</h2>
            <div className="flex items-center gap-3">
              <Button
                as={Link}
                href="https://chromewebstore.google.com/detail/multipost/dhohkaclnjgcikfoaacfgijgjgceofih"
                target="_blank"
                variant="flat"
                color="primary"
                startContent={
                  <Icon
                    icon="logos:chrome"
                    className="size-5"
                  />
                }>
                {t('welcome.chrome_store')}
              </Button>
              <Button
                as={Link}
                href="https://microsoftedge.microsoft.com/addons/detail/multipost/ckoiphiceimehjkolnfffgbmihoppgjg"
                target="_blank"
                variant="flat"
                color="secondary"
                startContent={
                  <Icon
                    icon="logos:microsoft-edge"
                    className="size-5"
                  />
                }>
                {t('welcome.edge_store')}
              </Button>
            </div>
          </div>
          <p className="text-foreground/80">{t('welcome.description')}</p>
          <div className="grid gap-6 sm:grid-cols-2">
            <HoverCard
              href="/dashboard/publish"
              title={t('welcome.publish.title')}
              titleIcon={<SendIcon className="size-5 text-foreground/50" />}
              titleDescription={t('welcome.publish.titleDescription')}
              hoverTitle={t('welcome.publish.action')}
              hoverDescription={t('welcome.publish.hoverDescription')}
            />

            <HoverCard
              href="https://md.multipost.app"
              isExternal
              title={t('welcome.markdown.title')}
              titleIcon={<FileTextIcon className="size-5 text-foreground/50" />}
              titleDescription={t('welcome.markdown.titleDescription')}
              hoverTitle={t('welcome.markdown.action')}
              hoverDescription={t('welcome.markdown.hoverDescription')}
            />

            <HoverCard
              href="/dashboard/webtrace"
              title={t('welcome.webtrace.title')}
              titleIcon={<ChartSplineIcon className="size-5 text-foreground/50" />}
              titleDescription={t('welcome.webtrace.titleDescription')}
              hoverTitle={t('welcome.webtrace.action')}
              hoverDescription={t('welcome.webtrace.hoverDescription')}
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
