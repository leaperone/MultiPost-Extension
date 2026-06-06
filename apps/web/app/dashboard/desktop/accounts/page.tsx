'use client';

import { useMemo, useState } from 'react';
import {
  Avatar,
  Button,
  Card,
  CardBody,
  Chip,
  Divider,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Spinner,
  Switch,
  Textarea,
  useDisclosure,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import {
  Check,
  CheckCircle2,
  Circle,
  KeyRound,
  LogIn,
  MoreHorizontal,
  Network,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Star,
  StickyNote,
  Trash2,
  UserCircle,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {
  getDesktopBridge,
  useDesktopAccounts,
  useDesktopPlatforms,
  useIsDesktop,
} from '@/lib/desktop-bridge';
import type { Account, ContentType, PlatformInfo, ProxyConfig } from '@/lib/desktop-bridge';

type ContentTypeFilter = 'ALL' | ContentType;
type ProxyProtocol = ProxyConfig['protocol'];

interface AccountSettingsForm {
  remark: string;
  proxyEnabled: boolean;
  proxyProtocol: ProxyProtocol;
  proxyHost: string;
  proxyPort: string;
  proxyUsername: string;
  proxyPassword: string;
}

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  DYNAMIC: '动态',
  VIDEO: '视频',
  ARTICLE: '文章',
  PODCAST: '播客',
};

const CONTENT_TYPE_FILTERS: Array<{ value: ContentTypeFilter; label: string }> = [
  { value: 'ALL', label: '全部' },
  { value: 'DYNAMIC', label: '动态' },
  { value: 'VIDEO', label: '视频' },
  { value: 'ARTICLE', label: '文章' },
  { value: 'PODCAST', label: '播客' },
];

const PROXY_PROTOCOLS: Array<{ value: ProxyProtocol; label: string }> = [
  { value: 'http', label: 'HTTP' },
  { value: 'https', label: 'HTTPS' },
  { value: 'socks5', label: 'SOCKS5' },
];

const PLATFORM_ACCENTS: Record<string, string> = {
  weibo: '#e6162d',
  xiaohongshu: '#ff2442',
  rednote: '#ff2442',
  twitter: '#111827',
  x: '#111827',
  douyin: '#00bcd4',
  bilibili: '#00a1d6',
  zhihu: '#1677ff',
  wechat: '#07c160',
  weixin: '#07c160',
  weixinchannel: '#07c160',
  xueqiu: '#1f6feb',
  okjike: '#ffe411',
  kuaishou: '#ff4906',
  baijiahao: '#2932e1',
  toutiao: '#f04142',
  toutiaohao: '#f04142',
  v2ex: '#778087',
  douban: '#2e963d',
  juejin: '#1e80ff',
  instagram: '#e4405f',
  facebook: '#1877f2',
  linkedin: '#0a66c2',
  reddit: '#ff4500',
  threads: '#111827',
  bluesky: '#1185fe',
  substack: '#ff6719',
  youtube: '#ff0000',
  tiktok: '#00bcd4',
  medium: '#111827',
  wordpress: '#21759b',
  spotify: '#1db954',
};

const FALLBACK_ACCENTS = ['#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c', '#0891b2'];

const DEFAULT_SETTINGS_FORM: AccountSettingsForm = {
  remark: '',
  proxyEnabled: false,
  proxyProtocol: 'http',
  proxyHost: '',
  proxyPort: '',
  proxyUsername: '',
  proxyPassword: '',
};

function getPlatformAccountKey(platform?: PlatformInfo): string {
  return platform?.accountKey || platform?.id || '';
}

function getPlatformAccent(platform?: PlatformInfo): string {
  const key = platform ? getPlatformAccountKey(platform) || platform.id : '';
  if (!key) return '#64748b';

  const configured = PLATFORM_ACCENTS[key] || PLATFORM_ACCENTS[platform?.id || ''];
  if (configured) return configured;

  let hash = 0;
  for (const char of key) {
    hash = (hash * 31 + char.charCodeAt(0)) % FALLBACK_ACCENTS.length;
  }
  return FALLBACK_ACCENTS[hash];
}

function getAccountLabel(account: Account): string {
  return account.displayName || account.username || account.platform;
}

function supportsContentType(platform: PlatformInfo | undefined, filter: ContentTypeFilter): boolean {
  return filter === 'ALL' || Boolean(platform?.supportedContentTypes.includes(filter));
}

function createSettingsForm(account: Account | null): AccountSettingsForm {
  if (!account) return DEFAULT_SETTINGS_FORM;

  const proxy = account.proxyConfig;
  return {
    remark: account.remark || '',
    proxyEnabled: Boolean(proxy),
    proxyProtocol: proxy?.protocol || 'http',
    proxyHost: proxy?.host || '',
    proxyPort: proxy?.port ? String(proxy.port) : '',
    proxyUsername: proxy?.username || '',
    proxyPassword: proxy?.password || '',
  };
}

function getSelectedKey(keys: unknown): string | null {
  if (keys === 'all' || !(keys instanceof Set)) return null;

  const [key] = Array.from(keys);
  return key == null ? null : String(key);
}

function isProxyProtocol(value: string | null): value is ProxyProtocol {
  return value === 'http' || value === 'https' || value === 'socks5';
}

function formatDateTime(timestamp?: number): string {
  if (!timestamp) return '从未';

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp);
}

function getProxyLabel(account: Account): string {
  const proxy = account.proxyConfig;
  if (!proxy) return '直连';

  return `${proxy.protocol.toUpperCase()} ${proxy.host}:${proxy.port}`;
}

function PlatformIcon({
  platform,
  className = 'size-10',
  iconClassName = 'size-5',
}: {
  platform?: PlatformInfo;
  className?: string;
  iconClassName?: string;
}) {
  const [faviconError, setFaviconError] = useState(false);
  const fallback = platform?.name?.slice(0, 1) || platform?.id?.slice(0, 1).toUpperCase() || '?';
  const accent = getPlatformAccent(platform);

  return (
    <span
      className={`${className} inline-flex shrink-0 items-center justify-center rounded-lg border text-sm font-semibold shadow-sm`}
      style={{
        backgroundColor: `${accent}14`,
        borderColor: `${accent}2e`,
        color: accent,
      }}>
      {platform?.faviconUrl && !faviconError ? (
        <img
          src={platform.faviconUrl}
          alt={platform.name}
          referrerPolicy="no-referrer"
          className={`${iconClassName} rounded-sm object-contain`}
          onError={() => setFaviconError(true)}
        />
      ) : platform?.iconifyIcon ? (
        <Icon
          icon={platform.iconifyIcon}
          className={iconClassName}
          style={{ color: accent }}
        />
      ) : (
        fallback
      )}
    </span>
  );
}

function AccountIdentityAvatar({
  account,
  size = 'lg',
}: {
  account: Account;
  size?: 'md' | 'lg';
}) {
  if (account.avatar) {
    return (
      <Avatar
        src={account.avatar}
        name={getAccountLabel(account)}
        size={size}
        imgProps={{ referrerPolicy: 'no-referrer' }}
      />
    );
  }

  const sizeClassName = size === 'lg' ? 'size-12' : 'size-10';
  const iconClassName = size === 'lg' ? 'size-6' : 'size-5';

  return (
    <div
      className={`${sizeClassName} flex shrink-0 items-center justify-center rounded-full border bg-default-100 text-muted-foreground`}>
      <UserCircle className={iconClassName} />
    </div>
  );
}

function ContentTypeChips({
  types,
  size = 'sm',
}: {
  types?: ContentType[];
  size?: 'sm' | 'md';
}) {
  if (!types?.length) {
    return (
      <Chip
        size={size}
        variant="flat">
        未配置
      </Chip>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {types.map((type) => (
        <Chip
          key={type}
          size={size}
          variant="flat"
          color={
            type === 'VIDEO'
              ? 'secondary'
              : type === 'ARTICLE'
                ? 'success'
                : type === 'PODCAST'
                  ? 'warning'
                  : 'primary'
          }>
          {CONTENT_TYPE_LABELS[type]}
        </Chip>
      ))}
    </div>
  );
}

/**
 * Desktop 账号管理页面
 */
export default function DesktopAccountsPage() {
  const isDesktop = useIsDesktop();
  const { accounts, loading, refresh } = useDesktopAccounts();
  const { platforms, loading: platformsLoading } = useDesktopPlatforms();
  const [searchQuery, setSearchQuery] = useState('');
  const [platformSearch, setPlatformSearch] = useState('');
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentTypeFilter>('ALL');
  const { isOpen: isAddOpen, onOpen: onAddOpen, onClose: onAddClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const { isOpen: isSettingsOpen, onOpen: onSettingsOpen, onClose: onSettingsClose } = useDisclosure();
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [accountToEdit, setAccountToEdit] = useState<Account | null>(null);
  const [settingsForm, setSettingsForm] = useState<AccountSettingsForm>(DEFAULT_SETTINGS_FORM);
  const [settingsError, setSettingsError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState<Set<string>>(new Set());

  const platformById = useMemo(() => {
    return new Map(platforms.map((platform) => [platform.id, platform]));
  }, [platforms]);

  const accountStats = useMemo(() => {
    const platformIds = new Set(accounts.map((account) => account.platform));
    const loggedIn = accounts.filter((account) => account.isLoggedIn).length;
    const proxyCount = accounts.filter((account) => account.proxyConfig).length;

    return {
      total: accounts.length,
      loggedIn,
      platformCount: platformIds.size,
      proxyCount,
    };
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return accounts.filter((account) => {
      const platform = platformById.get(account.platform);
      const accountKey = getPlatformAccountKey(platform).toLowerCase();
      const platformName = platform?.name.toLowerCase() || account.platform.toLowerCase();
      const proxyText = account.proxyConfig
        ? `${account.proxyConfig.protocol} ${account.proxyConfig.host} ${account.proxyConfig.port} ${
            account.proxyConfig.username || ''
          }`.toLowerCase()
        : '';
      const matchesSearch =
        !query ||
        account.username.toLowerCase().includes(query) ||
        account.displayName?.toLowerCase().includes(query) ||
        account.remark?.toLowerCase().includes(query) ||
        account.platform.toLowerCase().includes(query) ||
        platformName.includes(query) ||
        accountKey.includes(query) ||
        proxyText.includes(query);
      const matchesContentType = supportsContentType(platform, contentTypeFilter);

      return matchesSearch && matchesContentType;
    });
  }, [accounts, contentTypeFilter, platformById, searchQuery]);

  const filteredPlatforms = useMemo(() => {
    const query = platformSearch.trim().toLowerCase();

    return platforms.filter((platform) => {
      const accountKey = getPlatformAccountKey(platform).toLowerCase();
      const matchesSearch =
        !query ||
        platform.name.toLowerCase().includes(query) ||
        platform.id.toLowerCase().includes(query) ||
        accountKey.includes(query);
      const matchesContentType = supportsContentType(platform, contentTypeFilter);

      return matchesSearch && matchesContentType;
    });
  }, [contentTypeFilter, platformSearch, platforms]);

  const closeAddAccountModal = () => {
    setPlatformSearch('');
    onAddClose();
  };

  const closeSettingsModal = () => {
    if (isSavingSettings) return;
    setAccountToEdit(null);
    setSettingsForm(DEFAULT_SETTINGS_FORM);
    setSettingsError('');
    onSettingsClose();
  };

  const handleAddAccount = async (platform: string) => {
    const bridge = getDesktopBridge();
    if (!bridge) return;

    try {
      const newAccount = await bridge.account.create(platform);
      if (newAccount?.id) {
        await bridge.account.openLogin(newAccount.id);
      }
      closeAddAccountModal();
      refresh();
    } catch (error) {
      console.error('Failed to add account:', error);
    }
  };

  const handleDeleteAccount = async () => {
    if (!accountToDelete) return;

    const bridge = getDesktopBridge();
    if (!bridge) return;

    setIsDeleting(true);
    try {
      await bridge.account.delete(accountToDelete.id);
      onDeleteClose();
      refresh();
    } catch (error) {
      console.error('Failed to delete account:', error);
    } finally {
      setIsDeleting(false);
      setAccountToDelete(null);
    }
  };

  const handleCheckStatus = async (account: Account) => {
    const bridge = getDesktopBridge();
    if (!bridge) return;

    setCheckingStatus((prev) => new Set(prev).add(account.id));
    try {
      await bridge.account.checkLoginStatus(account.id);
      refresh();
    } catch (error) {
      console.error('Failed to check status:', error);
    } finally {
      setCheckingStatus((prev) => {
        const next = new Set(prev);
        next.delete(account.id);
        return next;
      });
    }
  };

  const handleOpenLogin = async (account: Account) => {
    const bridge = getDesktopBridge();
    if (!bridge) return;

    try {
      await bridge.account.openLogin(account.id);
    } catch (error) {
      console.error('Failed to open login:', error);
    }
  };

  const handleSetDefault = async (account: Account) => {
    const bridge = getDesktopBridge();
    if (!bridge) return;

    try {
      await bridge.account.setDefault(account.id);
      refresh();
    } catch (error) {
      console.error('Failed to set default:', error);
    }
  };

  const openSettings = (account: Account) => {
    setAccountToEdit(account);
    setSettingsForm(createSettingsForm(account));
    setSettingsError('');
    onSettingsOpen();
  };

  const handleSaveSettings = async () => {
    if (!accountToEdit) return;

    const bridge = getDesktopBridge();
    if (!bridge) return;

    let proxyConfig: ProxyConfig | undefined;

    if (settingsForm.proxyEnabled) {
      const host = settingsForm.proxyHost.trim();
      const port = Number(settingsForm.proxyPort);

      if (!host) {
        setSettingsError('请输入代理主机');
        return;
      }

      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        setSettingsError('请输入 1-65535 之间的端口');
        return;
      }

      proxyConfig = {
        protocol: settingsForm.proxyProtocol,
        host,
        port,
        username: settingsForm.proxyUsername.trim() || undefined,
        password: settingsForm.proxyPassword || undefined,
      };
    }

    setIsSavingSettings(true);
    setSettingsError('');

    try {
      await bridge.account.update(accountToEdit.id, {
        remark: settingsForm.remark.trim(),
        proxyConfig,
      });
      closeSettingsModal();
      refresh();
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : '保存失败');
      console.error('Failed to save account settings:', error);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const confirmDelete = (account: Account) => {
    setAccountToDelete(account);
    onDeleteOpen();
  };

  if (!isDesktop) {
    return (
      <div className="p-6">
        <Card className="rounded-lg border shadow-none">
          <CardBody className="flex-row items-center gap-3">
            <KeyRound className="size-5 text-muted-foreground" />
            <p className="text-muted-foreground">请在 Desktop 应用中打开此页面</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  const isPageLoading = loading || platformsLoading;

  return (
    <div className="flex h-full flex-col bg-default-50/30">
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border bg-background shadow-sm">
                <KeyRound className="size-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-normal">账号管理</h1>
                <p className="text-sm text-muted-foreground">
                  管理平台账号、默认账号、备注和独立网络。
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="bordered"
                startContent={<RefreshCw className="size-4" />}
                onPress={refresh}
                isLoading={loading}>
                刷新
              </Button>
              <Button
                color="primary"
                startContent={<Plus className="size-4" />}
                onPress={onAddOpen}>
                添加账号
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="rounded-lg border shadow-none">
              <CardBody className="gap-1 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="size-4" />
                  已添加账号
                </div>
                <div className="text-2xl font-semibold">{accountStats.total}</div>
              </CardBody>
            </Card>
            <Card className="rounded-lg border shadow-none">
              <CardBody className="gap-1 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="size-4" />
                  已登录
                </div>
                <div className="text-2xl font-semibold">{accountStats.loggedIn}</div>
              </CardBody>
            </Card>
            <Card className="rounded-lg border shadow-none">
              <CardBody className="gap-1 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Circle className="size-4" />
                  账号平台
                </div>
                <div className="text-2xl font-semibold">{accountStats.platformCount}</div>
              </CardBody>
            </Card>
            <Card className="rounded-lg border shadow-none">
              <CardBody className="gap-1 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Network className="size-4" />
                  独立网络
                </div>
                <div className="text-2xl font-semibold">{accountStats.proxyCount}</div>
              </CardBody>
            </Card>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border bg-background p-3 lg:flex-row lg:items-center lg:justify-between">
            <Input
              placeholder="搜索账号、备注、平台或代理"
              value={searchQuery}
              onValueChange={setSearchQuery}
              startContent={<Search className="size-4 text-muted-foreground" />}
              className="lg:max-w-sm"
            />
            <div className="flex flex-wrap gap-2">
              {CONTENT_TYPE_FILTERS.map((filter) => (
                <Button
                  key={filter.value}
                  size="sm"
                  variant={contentTypeFilter === filter.value ? 'solid' : 'bordered'}
                  color={contentTypeFilter === filter.value ? 'primary' : 'default'}
                  onPress={() => setContentTypeFilter(filter.value)}>
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>

          {isPageLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : filteredAccounts.length === 0 ? (
            <Card className="rounded-lg border shadow-none">
              <CardBody className="py-12">
                <div className="space-y-3 text-center">
                  <UserCircle className="mx-auto size-12 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery || contentTypeFilter !== 'ALL' ? '没有找到匹配的账号' : '还没有添加任何账号'}
                  </p>
                  <Button
                    color="primary"
                    variant="flat"
                    onPress={onAddOpen}>
                    添加账号
                  </Button>
                </div>
              </CardBody>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {filteredAccounts.map((account) => {
                const platform = platformById.get(account.platform);
                const accountKey = getPlatformAccountKey(platform) || account.platform;
                const isChecking = checkingStatus.has(account.id);
                const hasProxy = Boolean(account.proxyConfig);

                return (
                  <Card
                    key={account.id}
                    className="rounded-lg border shadow-none transition-colors hover:border-primary/50">
                    <CardBody className="gap-4 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <AccountIdentityAvatar account={account} />

                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="truncate text-base font-semibold">{getAccountLabel(account)}</h2>
                              {account.isDefault && (
                                <Chip
                                  size="sm"
                                  color="primary"
                                  variant="flat"
                                  startContent={<Star className="size-3" />}>
                                  默认
                                </Chip>
                              )}
                            </div>
                            <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
                              <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-default-100 px-2 py-1 text-foreground">
                                <PlatformIcon
                                  platform={platform}
                                  className="size-5 rounded-md border-0 shadow-none"
                                  iconClassName="size-3.5"
                                />
                                <span className="truncate">{platform?.name || account.platform}</span>
                              </span>
                              <span className="truncate text-muted-foreground">{accountKey}</span>
                            </div>
                          </div>
                        </div>

                        <Dropdown>
                          <DropdownTrigger>
                            <Button
                              isIconOnly
                              variant="light"
                              size="sm"
                              aria-label="更多操作"
                              title="更多操作">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownTrigger>
                          <DropdownMenu
                            disabledKeys={account.isDefault ? ['default'] : []}
                            onAction={(key) => {
                              switch (key) {
                                case 'settings':
                                  openSettings(account);
                                  break;
                                case 'check':
                                  handleCheckStatus(account);
                                  break;
                                case 'default':
                                  handleSetDefault(account);
                                  break;
                                case 'delete':
                                  confirmDelete(account);
                                  break;
                              }
                            }}>
                            <DropdownItem
                              key="settings"
                              startContent={<Settings2 className="size-4" />}>
                              账号设置
                            </DropdownItem>
                            <DropdownItem
                              key="check"
                              startContent={
                                isChecking ? <Spinner size="sm" /> : <RefreshCw className="size-4" />
                              }>
                              检查登录状态
                            </DropdownItem>
                            <DropdownItem
                              key="default"
                              className={account.isDefault ? 'hidden' : ''}
                              startContent={<Check className="size-4" />}>
                              设为默认
                            </DropdownItem>
                            <DropdownItem
                              key="delete"
                              className="text-danger"
                              color="danger"
                              startContent={<Trash2 className="size-4" />}>
                              删除账号
                            </DropdownItem>
                          </DropdownMenu>
                        </Dropdown>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Chip
                          size="sm"
                          color={account.isLoggedIn ? 'success' : 'warning'}
                          variant="flat"
                          startContent={
                            account.isLoggedIn ? <CheckCircle2 className="size-3" /> : <Circle className="size-3" />
                          }>
                          {account.isLoggedIn ? '已登录' : '未登录'}
                        </Chip>
                        <Chip
                          size="sm"
                          color={hasProxy ? 'secondary' : 'default'}
                          variant="flat"
                          startContent={hasProxy ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}>
                          {hasProxy ? '独立网络' : '直连'}
                        </Chip>
                      </div>

                      <div className="grid gap-2 text-sm sm:grid-cols-2">
                        <div className="min-w-0 rounded-lg border bg-background px-3 py-2">
                          <div className="text-xs text-muted-foreground">账号</div>
                          <div className="truncate font-medium">@{account.username}</div>
                        </div>
                        <div className="min-w-0 rounded-lg border bg-background px-3 py-2">
                          <div className="text-xs text-muted-foreground">最近登录</div>
                          <div className="truncate font-medium">{formatDateTime(account.lastLoginAt)}</div>
                        </div>
                      </div>

                      <div className="rounded-lg border bg-default-50/60 p-3">
                        <div className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                          <StickyNote className="size-3.5" />
                          备注
                        </div>
                        <p className="line-clamp-2 min-h-10 text-sm">
                          {account.remark || <span className="text-muted-foreground">未添加备注</span>}
                        </p>
                      </div>

                      <div className="rounded-lg border bg-background p-3">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <Network className="size-3.5" />
                            网络
                          </div>
                          <Chip
                            size="sm"
                            variant="flat"
                            color={hasProxy ? 'secondary' : 'default'}>
                            {hasProxy ? '代理' : '默认'}
                          </Chip>
                        </div>
                        <div className="truncate text-sm font-medium">{getProxyLabel(account)}</div>
                      </div>

                      <Divider />

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant="bordered"
                          startContent={<LogIn className="size-4" />}
                          onPress={() => handleOpenLogin(account)}>
                          {account.isLoggedIn ? '重新登录' : '登录'}
                        </Button>
                        <Button
                          size="sm"
                          variant="bordered"
                          startContent={isChecking ? <Spinner size="sm" /> : <RefreshCw className="size-4" />}
                          isDisabled={isChecking}
                          onPress={() => handleCheckStatus(account)}>
                          检查
                        </Button>
                        <Button
                          size="sm"
                          variant="flat"
                          startContent={<Pencil className="size-4" />}
                          onPress={() => openSettings(account)}>
                          设置
                        </Button>
                      </div>

                      <ContentTypeChips types={platform?.supportedContentTypes} />
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          )}

          <Modal
            isOpen={isAddOpen}
            onClose={closeAddAccountModal}
            size="5xl">
            <ModalContent>
              <ModalHeader className="flex flex-col gap-1">
                <span>添加账号</span>
                <span className="text-sm font-normal text-muted-foreground">
                  选择平台后会打开对应登录页。
                </span>
              </ModalHeader>
              <ModalBody className="max-h-[72vh] overflow-hidden">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <Input
                    placeholder="搜索平台或 accountKey"
                    value={platformSearch}
                    onValueChange={setPlatformSearch}
                    startContent={<Search className="size-4 text-muted-foreground" />}
                    className="lg:max-w-sm"
                  />
                  <div className="flex flex-wrap gap-2">
                    {CONTENT_TYPE_FILTERS.map((filter) => (
                      <Button
                        key={filter.value}
                        size="sm"
                        variant={contentTypeFilter === filter.value ? 'solid' : 'bordered'}
                        color={contentTypeFilter === filter.value ? 'primary' : 'default'}
                        onPress={() => setContentTypeFilter(filter.value)}>
                        {filter.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                  {filteredPlatforms.length === 0 ? (
                    <div className="py-12 text-center text-sm text-muted-foreground">没有找到匹配的平台</div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {filteredPlatforms.map((platform) => {
                        const accountKey = getPlatformAccountKey(platform);

                        return (
                          <Card
                            key={platform.id}
                            isPressable
                            className="rounded-lg border shadow-none transition-colors hover:border-primary/60"
                            onPress={() => handleAddAccount(platform.id)}>
                            <CardBody className="gap-3 p-4">
                              <div className="flex items-start gap-3">
                                <PlatformIcon platform={platform} />
                                <div className="min-w-0 flex-1">
                                  <div className="truncate font-medium">{platform.name}</div>
                                  <div className="truncate text-xs text-muted-foreground">{accountKey}</div>
                                </div>
                              </div>
                              <ContentTypeChips types={platform.supportedContentTypes} />
                            </CardBody>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="light"
                  onPress={closeAddAccountModal}>
                  取消
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>

          <Modal
            isOpen={isSettingsOpen}
            onClose={closeSettingsModal}
            size="2xl">
            <ModalContent>
              <ModalHeader className="flex flex-col gap-1">
                <span>账号设置</span>
                {accountToEdit && (
                  <span className="text-sm font-normal text-muted-foreground">
                    {getAccountLabel(accountToEdit)}
                  </span>
                )}
              </ModalHeader>
              <ModalBody className="gap-5">
                {accountToEdit && (
                  <div className="flex items-center gap-3 rounded-lg border bg-default-50/60 p-3">
                    <AccountIdentityAvatar
                      account={accountToEdit}
                      size="md"
                    />
                    <div className="min-w-0">
                      <div className="truncate font-medium">{getAccountLabel(accountToEdit)}</div>
                      <div className="truncate text-sm text-muted-foreground">
                        {platformById.get(accountToEdit.platform)?.name || accountToEdit.platform} / @
                        {accountToEdit.username}
                      </div>
                    </div>
                  </div>
                )}

                <Textarea
                  label="账号备注"
                  placeholder="例如：品牌号、客户 A、备用号"
                  value={settingsForm.remark}
                  minRows={3}
                  maxRows={5}
                  maxLength={200}
                  onValueChange={(value) =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      remark: value,
                    }))
                  }
                />

                <Divider />

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">账号网络</h3>
                      <p className="text-sm text-muted-foreground">{settingsForm.proxyEnabled ? '代理' : '直连'}</p>
                    </div>
                    <Switch
                      isSelected={settingsForm.proxyEnabled}
                      onValueChange={(isSelected) =>
                        setSettingsForm((prev) => ({
                          ...prev,
                          proxyEnabled: isSelected,
                        }))
                      }>
                      启用代理
                    </Switch>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <Select
                      label="协议"
                      selectedKeys={[settingsForm.proxyProtocol]}
                      isDisabled={!settingsForm.proxyEnabled}
                      onSelectionChange={(keys) => {
                        const value = getSelectedKey(keys);
                        if (!isProxyProtocol(value)) return;
                        setSettingsForm((prev) => ({
                          ...prev,
                          proxyProtocol: value,
                        }));
                      }}>
                      {PROXY_PROTOCOLS.map((protocol) => (
                        <SelectItem key={protocol.value}>{protocol.label}</SelectItem>
                      ))}
                    </Select>
                    <Input
                      label="主机"
                      value={settingsForm.proxyHost}
                      isDisabled={!settingsForm.proxyEnabled}
                      className="sm:col-span-2"
                      onValueChange={(value) =>
                        setSettingsForm((prev) => ({
                          ...prev,
                          proxyHost: value,
                        }))
                      }
                    />
                    <Input
                      label="端口"
                      type="number"
                      value={settingsForm.proxyPort}
                      isDisabled={!settingsForm.proxyEnabled}
                      onValueChange={(value) =>
                        setSettingsForm((prev) => ({
                          ...prev,
                          proxyPort: value.replace(/[^\d]/g, '').slice(0, 5),
                        }))
                      }
                    />
                    <Input
                      label="用户名"
                      value={settingsForm.proxyUsername}
                      isDisabled={!settingsForm.proxyEnabled}
                      onValueChange={(value) =>
                        setSettingsForm((prev) => ({
                          ...prev,
                          proxyUsername: value,
                        }))
                      }
                    />
                    <Input
                      label="密码"
                      type="password"
                      value={settingsForm.proxyPassword}
                      isDisabled={!settingsForm.proxyEnabled}
                      onValueChange={(value) =>
                        setSettingsForm((prev) => ({
                          ...prev,
                          proxyPassword: value,
                        }))
                      }
                    />
                  </div>
                </div>

                {settingsError && <p className="text-sm text-danger">{settingsError}</p>}
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="light"
                  onPress={closeSettingsModal}
                  isDisabled={isSavingSettings}>
                  取消
                </Button>
                <Button
                  color="primary"
                  onPress={handleSaveSettings}
                  isLoading={isSavingSettings}>
                  保存
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>

          <Modal
            isOpen={isDeleteOpen}
            onClose={onDeleteClose}>
            <ModalContent>
              <ModalHeader>确认删除</ModalHeader>
              <ModalBody>
                <p>
                  确定要删除账号 <strong>{accountToDelete ? getAccountLabel(accountToDelete) : ''}</strong>{' '}
                  吗？此操作不可撤销。
                </p>
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="light"
                  onPress={onDeleteClose}>
                  取消
                </Button>
                <Button
                  color="danger"
                  onPress={handleDeleteAccount}
                  isLoading={isDeleting}>
                  删除
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        </div>
      </div>
    </div>
  );
}
