'use client';

import { useMemo, useState } from 'react';
import {
  Avatar,
  Button,
  Card,
  CardBody,
  Chip,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Image,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
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
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  UserCircle,
  Users,
} from 'lucide-react';
import {
  Account,
  ContentType,
  getDesktopBridge,
  PlatformInfo,
  useDesktopAccounts,
  useDesktopPlatforms,
  useIsDesktop,
} from '@/lib/desktop-bridge';

type ContentTypeFilter = 'ALL' | ContentType;

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

function getPlatformAccountKey(platform?: PlatformInfo): string {
  return platform?.accountKey || platform?.id || '';
}

function getAccountLabel(account: Account): string {
  return account.displayName || account.username || account.platform;
}

function supportsContentType(platform: PlatformInfo | undefined, filter: ContentTypeFilter): boolean {
  return filter === 'ALL' || Boolean(platform?.supportedContentTypes.includes(filter));
}

function PlatformIcon({ platform, className = 'size-10' }: { platform?: PlatformInfo; className?: string }) {
  const [faviconError, setFaviconError] = useState(false);
  const fallback = platform?.name?.slice(0, 1) || platform?.id?.slice(0, 1).toUpperCase() || '?';

  return (
    <span
      className={`${className} inline-flex shrink-0 items-center justify-center rounded-lg border bg-background text-sm font-semibold text-foreground shadow-sm`}>
      {platform?.iconifyIcon ? (
        <Icon
          icon={platform.iconifyIcon}
          className="size-5"
        />
      ) : platform?.faviconUrl && !faviconError ? (
        <Image
          src={platform.faviconUrl}
          alt={platform.name}
          width={20}
          height={20}
          removeWrapper
          className="size-5 rounded-sm"
          onError={() => setFaviconError(true)}
        />
      ) : (
        fallback
      )}
    </span>
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
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState<Set<string>>(new Set());

  const platformById = useMemo(() => {
    return new Map(platforms.map((platform) => [platform.id, platform]));
  }, [platforms]);

  const accountStats = useMemo(() => {
    const platformIds = new Set(accounts.map((account) => account.platform));
    const loggedIn = accounts.filter((account) => account.isLoggedIn).length;
    const multiTypePlatforms = platforms.filter((platform) => platform.supportedContentTypes.length > 1).length;

    return {
      total: accounts.length,
      loggedIn,
      platformCount: platformIds.size,
      multiTypePlatforms,
    };
  }, [accounts, platforms]);

  const filteredAccounts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return accounts.filter((account) => {
      const platform = platformById.get(account.platform);
      const accountKey = getPlatformAccountKey(platform).toLowerCase();
      const platformName = platform?.name.toLowerCase() || account.platform.toLowerCase();
      const matchesSearch =
        !query ||
        account.username.toLowerCase().includes(query) ||
        account.displayName?.toLowerCase().includes(query) ||
        account.platform.toLowerCase().includes(query) ||
        platformName.includes(query) ||
        accountKey.includes(query);
      const matchesContentType = supportsContentType(platform, contentTypeFilter);

      return matchesSearch && matchesContentType;
    });
  }, [accounts, contentTypeFilter, platformById, searchQuery]);

  const accountsByPlatform = useMemo(() => {
    return filteredAccounts.reduce(
      (acc, account) => {
        if (!acc[account.platform]) {
          acc[account.platform] = [];
        }
        acc[account.platform].push(account);
        return acc;
      },
      {} as Record<string, Account[]>
    );
  }, [filteredAccounts]);

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

  const confirmDelete = (account: Account) => {
    setAccountToDelete(account);
    onDeleteOpen();
  };

  if (!isDesktop) {
    return (
      <div className="p-6">
        <Card className="border shadow-none">
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
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-6 overflow-auto p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-12 items-center justify-center rounded-lg border bg-background shadow-sm">
              <KeyRound className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal">账号管理</h1>
              <p className="text-sm text-muted-foreground">
                账号按平台保存，发布能力按动态、视频、文章、播客区分。
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
          <Card className="border shadow-none">
            <CardBody className="gap-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="size-4" />
                已添加账号
              </div>
              <div className="text-2xl font-semibold">{accountStats.total}</div>
            </CardBody>
          </Card>
          <Card className="border shadow-none">
            <CardBody className="gap-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="size-4" />
                已登录
              </div>
              <div className="text-2xl font-semibold">{accountStats.loggedIn}</div>
            </CardBody>
          </Card>
          <Card className="border shadow-none">
            <CardBody className="gap-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Circle className="size-4" />
                账号平台
              </div>
              <div className="text-2xl font-semibold">{accountStats.platformCount}</div>
            </CardBody>
          </Card>
          <Card className="border shadow-none">
            <CardBody className="gap-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="size-4" />
                多类型平台
              </div>
              <div className="text-2xl font-semibold">{accountStats.multiTypePlatforms}</div>
            </CardBody>
          </Card>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border bg-background p-3 lg:flex-row lg:items-center">
          <Input
            placeholder="搜索账号、平台或 accountKey"
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
          <Card className="border shadow-none">
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
          <div className="space-y-5">
            {Object.entries(accountsByPlatform).map(([platformId, platformAccounts]) => {
              const platform = platformById.get(platformId);
              const accountKey = getPlatformAccountKey(platform) || platformId;

              return (
                <section
                  key={platformId}
                  className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <PlatformIcon platform={platform} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h2 className="truncate text-base font-semibold">{platform?.name || platformId}</h2>
                          <Chip
                            size="sm"
                            variant="flat">
                            {platformAccounts.length} 个账号
                          </Chip>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">accountKey: {accountKey}</p>
                      </div>
                    </div>
                    <ContentTypeChips types={platform?.supportedContentTypes} />
                  </div>

                  <div className="grid gap-3 xl:grid-cols-2">
                    {platformAccounts.map((account) => (
                      <Card
                        key={account.id}
                        className="border shadow-none">
                        <CardBody>
                          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="relative shrink-0">
                                <Avatar
                                  src={account.avatar}
                                  name={getAccountLabel(account)}
                                  size="md"
                                  imgProps={{ referrerPolicy: 'no-referrer' }}
                                />
                                <span className="absolute -bottom-1 -right-1">
                                  <PlatformIcon
                                    platform={platform}
                                    className="size-6"
                                  />
                                </span>
                              </div>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="truncate font-medium">{getAccountLabel(account)}</span>
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
                                <p className="truncate text-sm text-muted-foreground">@{account.username}</p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 md:justify-end">
                              <Chip
                                size="sm"
                                color={account.isLoggedIn ? 'success' : 'warning'}
                                variant="flat">
                                {account.isLoggedIn ? '已登录' : '未登录'}
                              </Chip>
                              <Button
                                size="sm"
                                variant="bordered"
                                startContent={<LogIn className="size-4" />}
                                onPress={() => handleOpenLogin(account)}>
                                {account.isLoggedIn ? '重新登录' : '登录'}
                              </Button>
                              <Dropdown>
                                <DropdownTrigger>
                                  <Button
                                    isIconOnly
                                    variant="light"
                                    size="sm">
                                    <MoreHorizontal className="size-4" />
                                  </Button>
                                </DropdownTrigger>
                                <DropdownMenu
                                  disabledKeys={account.isDefault ? ['default'] : []}
                                  onAction={(key) => {
                                    switch (key) {
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
                                    key="check"
                                    startContent={
                                      checkingStatus.has(account.id) ? (
                                        <Spinner size="sm" />
                                      ) : (
                                        <RefreshCw className="size-4" />
                                      )
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
                          </div>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                </section>
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
                选择账号平台，平台支持的发布类型会在卡片上标出。
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
                          className="border shadow-none transition-colors hover:border-primary/60"
                          onPress={() => handleAddAccount(platform.id)}>
                          <CardBody className="gap-3">
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
  );
}
