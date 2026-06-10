import { createFileRoute } from '@tanstack/react-router';
import { Avatar, Button, Card, CardBody, Chip } from '@heroui/react';
import { LogInIcon, RefreshCwIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';

import {
  getDesktopBridge,
  useDesktopAccounts,
  useDesktopPlatforms,
  useIsDesktop,
  type Account,
  type PlatformInfo,
} from '@/lib/desktop-bridge';
import { routeMeta } from '../../../lib/seo';
import {
  DesktopPageShell,
  DesktopRequiredCard,
  EmptyState,
  findPlatform,
  getAccountLabel,
  LoadingState,
  PlatformIcon,
} from './-components';

export const Route = createFileRoute('/dashboard/desktop/accounts')({
  head: () => ({
    meta: routeMeta({
      title: 'Desktop Accounts | MultiPost',
      description: 'Manage MultiPost Desktop social accounts.',
      robots: 'noindex, nofollow',
    }),
  }),
  component: DesktopAccountsPage,
});

function DesktopAccountsPage() {
  const isDesktop = useIsDesktop();
  const { accounts, loading: accountsLoading, refresh } = useDesktopAccounts();
  const { platforms, loading: platformsLoading } = useDesktopPlatforms();
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!isDesktop) return <DesktopRequiredCard />;

  const loading = accountsLoading || platformsLoading;

  const openLogin = async (platform: PlatformInfo) => {
    const bridge = getDesktopBridge();
    if (!bridge) return;

    setBusyId(platform.id);
    try {
      const account = await bridge.account.create(platform.id);
      await bridge.account.openLogin(account.id);
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  const deleteAccount = async (account: Account) => {
    const bridge = getDesktopBridge();
    if (!bridge) return;

    setBusyId(account.id);
    try {
      await bridge.account.delete(account.id);
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <DesktopPageShell
      title="Accounts"
      description="Manage social accounts connected to MultiPost Desktop."
      actions={
        <Button
          variant="bordered"
          startContent={<RefreshCwIcon className="size-4" />}
          isLoading={loading}
          onPress={refresh}>
          Refresh
        </Button>
      }>
      {loading ? (
        <LoadingState />
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Add account</h2>
            {platforms.length === 0 ? (
              <EmptyState
                title="No Desktop platforms"
                description="Desktop did not return a platform list."
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {platforms.map((platform) => (
                  <Card
                    key={platform.id}
                    className="shadow-none border">
                    <CardBody className="flex flex-row items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <PlatformIcon platform={platform} />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{platform.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {platform.supportedContentTypes.join(', ')}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        color="primary"
                        isIconOnly
                        aria-label={`Login ${platform.name}`}
                        isLoading={busyId === platform.id}
                        onPress={() => openLogin(platform)}>
                        <LogInIcon className="size-4" />
                      </Button>
                    </CardBody>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Connected accounts</h2>
            {accounts.length === 0 ? (
              <EmptyState
                title="No accounts yet"
                description="Use the platform list above to add an account."
              />
            ) : (
              <div className="grid gap-3">
                {accounts.map((account) => {
                  const platform = findPlatform(platforms, account.platform);
                  return (
                    <Card
                      key={account.id}
                      className="shadow-none border">
                      <CardBody className="flex flex-row items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar
                            src={account.avatar}
                            name={getAccountLabel(account)}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{getAccountLabel(account)}</p>
                            <p className="truncate text-sm text-muted-foreground">
                              {platform?.name || account.platform}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Chip
                            size="sm"
                            color={account.isLoggedIn ? 'success' : 'warning'}
                            variant="flat">
                            {account.isLoggedIn ? 'Logged in' : 'Login needed'}
                          </Chip>
                          <Button
                            size="sm"
                            variant="light"
                            color="danger"
                            isIconOnly
                            aria-label={`Delete ${getAccountLabel(account)}`}
                            isLoading={busyId === account.id}
                            onPress={() => deleteAccount(account)}>
                            <Trash2Icon className="size-4" />
                          </Button>
                        </div>
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </DesktopPageShell>
  );
}
