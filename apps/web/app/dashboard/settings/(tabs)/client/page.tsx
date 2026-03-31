import { Suspense } from 'react';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { Alert, Button, Card } from '@heroui/react';
import { Loader2, Router, Clock, Users, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import LinkButton from './LinkExtensionButton';
import EditNameButton from './EditNameButton';
import { createTranslation } from '@/i18n/server';
import DeleteClientButton from './DeleteClientButton';
import { cn } from '@/lib/utils';

// Server component for fetching and displaying clients
async function ClientsList() {
  const { t } = await createTranslation('publish');
  const session = await auth();
  if (!session?.user?.id) return null;

  const clients = await prisma.extensionClient.findMany({
    where: { userId: session.user.id, deletedAt: null },
    orderBy: { updatedAt: 'desc' },
  });

  if (clients.length === 0) {
    return (
      <Card className="shadow-none border p-12 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-default-100">
            <Router className="size-8 text-foreground/40" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-foreground/90">{t('client.page.empty')}</h3>
            <p className="mt-1 text-sm text-foreground/60">{t('client.page.description')}</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
      {clients.map((client) => (
        <Card key={client.id} className="shadow-none border p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-blue-500/20">
              <Router className="size-5 text-blue-500 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-medium text-foreground/90">{client.name}</h4>
              <p className="text-sm text-foreground/60">
                {t('client.page.last_seen', {
                  time: formatDistanceToNow(client.updatedAt, { addSuffix: true }),
                })}
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div className={cn('rounded-xl p-4', 'bg-default-100')}>
              <p className="mb-1 text-sm text-foreground/60">Client ID</p>
              <p className="break-all font-mono text-sm text-foreground/90">{client.id}</p>
            </div>
            <div className="flex justify-between gap-2">
              <Button
                as="a"
                href={`/dashboard/settings/client/${client.id}`}
                size="sm"
                variant="flat"
                className="border bg-default-100 shadow-none"
                endContent={<ArrowRight className="size-3" />}>
                View Details
              </Button>
              <div className="flex gap-2">
                <EditNameButton clientId={client.id} initialName={client.name} />
                <DeleteClientButton clientId={client.id} />
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default async function ClientsPage() {
  const { t } = await createTranslation('publish');
  const session = await auth();
  if (!session?.user?.id) return null;

  const clientCount = await prisma.extensionClient.count({
    where: { userId: session.user.id, deletedAt: null },
  });

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header Section */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('client.page.title')}</h1>
          <p className="mt-2 text-muted-foreground">{t('client.page.description')}</p>
        </div>
        <LinkButton />
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="shadow-none border p-5">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-default-100">
              <Users className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('client.page.connected_clients')}</p>
              <p className="text-2xl font-bold text-foreground">{clientCount}</p>
            </div>
          </div>
        </Card>
        <Card className="shadow-none border p-5">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-default-100">
              <Clock className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('client.page.active_status')}</p>
              <p className="text-2xl font-bold text-foreground">{clientCount > 0 ? t('client.page.online', { count: clientCount }) : t('client.page.offline')}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Alert */}
      <div className="mb-8">
        <Card className="shadow-none border p-4">
          <p className="text-sm text-amber-500 dark:text-amber-400">{t('client.page.alert')}</p>
        </Card>
      </div>

      {/* Clients List */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-foreground/60" />
          </div>
        }>
        <ClientsList />
      </Suspense>
    </div>
  );
}
