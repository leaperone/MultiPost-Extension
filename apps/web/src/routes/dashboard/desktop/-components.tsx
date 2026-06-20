import { Avatar, Button, Card, CardBody, Checkbox, Chip, Spinner } from '@heroui/react';
import { Icon } from '@iconify/react';
import { MonitorIcon } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  getDesktopBridge,
  type Account,
  type ContentType,
  type PlatformInfo,
} from '@/lib/desktop-bridge';
import { contentTypeLabels } from '@/lib/desktop-content-types';

export {
  contentTypeLabels,
  getContentTypeLabel,
  getPublishPathForContentType,
  isKnownContentType,
  publishPathByContentType,
} from '@/lib/desktop-content-types';

export function DesktopPageShell({
  title,
  description,
  actions,
  children,
  maxWidth = 'max-w-5xl',
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  maxWidth?: string;
}) {
  return (
    <div className={`space-y-6 p-6 ${maxWidth}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {description ? <p className="text-muted-foreground">{description}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

export function DesktopRequiredCard() {
  return (
    <div className="p-6">
      <Card className="shadow-none border">
        <CardBody className="flex flex-row items-center gap-3">
          <MonitorIcon className="size-5 text-muted-foreground" />
          <p className="text-muted-foreground">Open this page in MultiPost Desktop.</p>
        </CardBody>
      </Card>
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <Spinner size="lg" />
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <Card className="shadow-none border">
      <CardBody className="items-center py-12 text-center">
        <p className="font-medium">{title}</p>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </CardBody>
    </Card>
  );
}

export function useDesktopVersion() {
  const [version, setVersion] = useState('');
  const [platform, setPlatform] = useState('Web');

  useEffect(() => {
    const bridge = getDesktopBridge();
    if (!bridge) return;

    setPlatform(bridge.env.platform);
    void bridge.app.getVersion().then(setVersion);
  }, []);

  return { version, platform };
}

export function formatDateTime(timestamp?: number) {
  if (!timestamp) return 'Never';

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp);
}

export function getAccountLabel(account: Account) {
  return account.displayName || account.remark || account.username || account.platform;
}

export function findPlatform(platforms: PlatformInfo[], platformId: string) {
  return platforms.find((platform) => platform.id === platformId);
}

export function PlatformIcon({ platform }: { platform?: PlatformInfo }) {
  const [faviconError, setFaviconError] = useState(false);
  const fallback = (platform?.name || platform?.id || '?').slice(0, 1).toUpperCase();

  return (
    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border bg-default-100 text-sm font-semibold">
      {platform?.faviconUrl && !faviconError ? (
        <img
          src={platform.faviconUrl}
          alt={platform.name}
          referrerPolicy="no-referrer"
          className="size-5 rounded-sm object-contain"
          onError={() => setFaviconError(true)}
        />
      ) : platform?.iconifyIcon ? (
        <Icon
          icon={platform.iconifyIcon}
          className="size-5"
        />
      ) : (
        fallback
      )}
    </span>
  );
}

export function AccountSelection({
  accounts,
  platforms,
  contentType,
  selected,
  onToggle,
}: {
  accounts: Account[];
  platforms: PlatformInfo[];
  contentType: ContentType;
  selected: string[];
  onToggle: (accountId: string) => void;
}) {
  const grouped = useMemo(() => {
    const eligible = accounts.filter((account) => {
      const platform = findPlatform(platforms, account.platform);
      return platform?.supportedContentTypes.includes(contentType);
    });

    return eligible.reduce<Record<string, Account[]>>((acc, account) => {
      acc[account.platform] ??= [];
      acc[account.platform].push(account);
      return acc;
    }, {});
  }, [accounts, contentType, platforms]);

  const entries = Object.entries(grouped);

  if (entries.length === 0) {
    return (
      <EmptyState
        title="No eligible accounts"
        description={`Add a Desktop account that supports ${contentTypeLabels[contentType]}.`}
      />
    );
  }

  return (
    <div className="grid gap-3">
      {entries.map(([platformId, platformAccounts]) => {
        const platform = findPlatform(platforms, platformId);
        const allSelected = platformAccounts.every((account) => selected.includes(account.id));

        return (
          <Card
            key={platformId}
            className="shadow-none border">
            <CardBody className="gap-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <PlatformIcon platform={platform} />
                  <div>
                    <p className="font-medium">{platform?.name || platformId}</p>
                    <p className="text-xs text-muted-foreground">
                      {platformAccounts.length} account{platformAccounts.length === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="flat"
                  onPress={() => {
                    const ids = platformAccounts.map((account) => account.id);
                    const shouldSelect = !allSelected;
                    ids.forEach((id) => {
                      if (selected.includes(id) !== shouldSelect) onToggle(id);
                    });
                  }}>
                  {allSelected ? 'Clear' : 'Select all'}
                </Button>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {platformAccounts.map((account) => (
                  <Checkbox
                    key={account.id}
                    isSelected={selected.includes(account.id)}
                    onValueChange={() => onToggle(account.id)}>
                    <span className="flex items-center gap-2">
                      <Avatar
                        src={account.avatar}
                        name={getAccountLabel(account)}
                        size="sm"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {getAccountLabel(account)}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {account.isLoggedIn ? 'Logged in' : 'Login needed'}
                        </span>
                      </span>
                    </span>
                  </Checkbox>
                ))}
              </div>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}

export function StatusChip({
  status,
}: {
  status: 'success' | 'failed' | 'pending' | 'completed' | 'processing' | 'idle' | 'cancelled';
}) {
  const color =
    status === 'success' || status === 'completed'
      ? 'success'
      : status === 'failed'
        ? 'danger'
        : status === 'processing'
          ? 'primary'
          : status === 'pending'
            ? 'warning'
            : 'default';

  return (
    <Chip
      size="sm"
      color={color}
      variant="flat">
      {status}
    </Chip>
  );
}
