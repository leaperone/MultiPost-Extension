import { Suspense } from 'react';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { Alert, Card, CardHeader, CardBody } from '@heroui/react';
import { Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import LinkButton from './LinkExtensionButton';
import EditNameButton from './EditNameButton';
import { createTranslation } from '@/i18n/server';

// Server component for fetching and displaying clients
async function ClientsList() {
  const { t } = await createTranslation('publish');
  const session = await auth();
  if (!session?.user?.id) return null;

  const clients = await prisma.extensionClient.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
  });

  if (clients.length === 0) {
    return (
      <Card>
        <CardBody>
          <p className="text-center text-muted-foreground">{t('client.page.empty')}</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {clients.map((client) => (
        <Card key={client.id}>
          <CardHeader className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-medium">{client.name}</h4>
              <p className="text-sm text-default-500">
                {t('client.page.last_seen', {
                  time: formatDistanceToNow(client.updatedAt, { addSuffix: true }),
                })}
              </p>
            </div>
            <EditNameButton
              clientId={client.id}
              initialName={client.name}
            />
          </CardHeader>
          <CardBody>
            <p>Client ID: {client.id}</p>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

export default async function ClientsPage() {
  const { t } = await createTranslation('publish');

  return (
    <div className="container space-y-6 py-6">
      <Alert
        variant="flat"
        color="primary">
        {t('client.page.alert')}
      </Alert>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('client.page.title')}</h1>
          <p className="text-muted-foreground">{t('client.page.description')}</p>
        </div>
        <LinkButton />
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin" />
          </div>
        }>
        <ClientsList />
      </Suspense>
    </div>
  );
}
