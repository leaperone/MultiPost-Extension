import { Suspense } from 'react';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { Alert, Card, CardHeader, CardBody } from '@heroui/react';
import { Loader2, Router, Clock, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import LinkButton from './LinkExtensionButton';
import EditNameButton from './EditNameButton';
import { createTranslation } from '@/i18n/server';
import DeleteClientButton from './DeleteClientButton';

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
      <Card className="border border-default-200 shadow-none">
        <CardBody className="py-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-full bg-default-100">
              <Router className="size-8 text-default-400" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-foreground">{t('client.page.empty')}</h3>
              <p className="mt-1 text-sm text-foreground/60">{t('client.page.description')}</p>
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
      {clients.map((client) => (
        <Card
          key={client.id}
          className="border border-default-200 shadow-none transition-colors hover:border-default-300">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <Router className="size-5 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-medium text-foreground">{client.name}</h4>
                <p className="text-sm text-foreground/60">
                  {t('client.page.last_seen', {
                    time: formatDistanceToNow(client.updatedAt, { addSuffix: true }),
                  })}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardBody className="space-y-4 pt-0">
            <div className="rounded-lg bg-default-50 p-4">
              <p className="mb-1 text-sm text-foreground/60">Client ID</p>
              <p className="break-all font-mono text-sm text-foreground">{client.id}</p>
            </div>
            <div className="flex justify-end gap-2">
              <EditNameButton
                clientId={client.id}
                initialName={client.name}
              />
              <DeleteClientButton clientId={client.id} />
            </div>
          </CardBody>
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
    <div className="size-full overflow-y-auto p-6">
      {/* Header Section */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('client.page.title')}</h1>
          <p className="mt-2 text-foreground/60">{t('client.page.description')}</p>
        </div>
        <LinkButton />
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="border border-default-200 shadow-none transition-colors hover:border-default-300">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-foreground/60">{t('client.page.connected_clients')}</p>
                <p className="text-2xl font-bold text-foreground">{clientCount}</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="border border-default-200 shadow-none transition-colors hover:border-default-300">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-secondary/10">
                <Clock className="size-5 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-foreground/60">{t('client.page.active_status')}</p>
                <p className="text-2xl font-bold text-foreground">
                  {clientCount > 0
                    ? t('client.page.online', { count: clientCount })
                    : t('client.page.offline')}
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Alert */}
      <div className="mb-8">
        <Alert
          variant="flat"
          className="border border-warning/20 shadow-none">
          {t('client.page.alert')}
        </Alert>
      </div>

      {/* Clients List */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin" />
          </div>
        }>
        <ClientsList />
      </Suspense>
    </div>
  );
}
