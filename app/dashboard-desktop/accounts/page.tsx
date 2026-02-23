'use client';

import { useState } from 'react';
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
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
  useDisclosure,
} from '@heroui/react';
import {
  Check,
  ChevronDown,
  LogIn,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserCircle,
} from 'lucide-react';
import {
  Account,
  getDesktopBridge,
  useDesktopAccounts,
  useDesktopPlatforms,
  useIsDesktop,
} from '@/lib/desktop-bridge';

/**
 * Desktop 账号管理页面
 *
 * 功能:
 * - 显示所有已登录账号
 * - 添加新账号（调用 JS Bridge 打开登录窗口）
 * - 删除账号
 * - 检查登录状态
 * - 账号分组管理
 * - 浏览器标签栏管理
 */
export default function DesktopAccountsPage() {
  const isDesktop = useIsDesktop();
  const { accounts, loading, refresh } = useDesktopAccounts();
  const { platforms } = useDesktopPlatforms();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const { isOpen: isAddOpen, onOpen: onAddOpen, onClose: onAddClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState<Set<string>>(new Set());

  // 过滤账号
  const filteredAccounts = accounts.filter((account) => {
    const matchesSearch =
      !searchQuery ||
      account.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.displayName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform = !selectedPlatform || account.platform === selectedPlatform;
    return matchesSearch && matchesPlatform;
  });

  // 按平台分组账号
  const accountsByPlatform = filteredAccounts.reduce(
    (acc, account) => {
      if (!acc[account.platform]) {
        acc[account.platform] = [];
      }
      acc[account.platform].push(account);
      return acc;
    },
    {} as Record<string, Account[]>
  );

  // 添加账号
  const handleAddAccount = async (platform: string) => {
    const bridge = getDesktopBridge();
    if (!bridge) return;

    try {
      const newAccount = await bridge.account.create(platform);
      // 立即打开登录页
      if (newAccount?.id) {
        await bridge.account.openLogin(newAccount.id);
      }
      onAddClose();
      refresh();
    } catch (error) {
      console.error('Failed to add account:', error);
    }
  };

  // 删除账号
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

  // 检查登录状态
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

  // 打开登录窗口
  const handleOpenLogin = async (account: Account) => {
    console.log("[AccountsPage] handleOpenLogin called, account:", account.id);
    const bridge = getDesktopBridge();
    if (!bridge) return;

    try {
      await bridge.account.openLogin(account.id);
    } catch (error) {
      console.error('Failed to open login:', error);
    }
  };

  // 设为默认账号
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

  // 获取平台显示名称
  const getPlatformName = (platformId: string) => {
    const platform = platforms.find((p) => p.id === platformId);
    return platform?.name || platformId;
  };

  // 确认删除
  const confirmDelete = (account: Account) => {
    setAccountToDelete(account);
    onDeleteOpen();
  };

  if (!isDesktop) {
    return (
      <div className="p-6">
        <Card className="shadow-none border">
          <CardBody>
            <p className="text-muted-foreground">请在 Desktop 应用中打开此页面</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">

      {/* 主内容区域 */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* 页面标题和操作 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">账号管理</h1>
            <p className="text-muted-foreground">管理已登录的社交媒体账号</p>
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

        {/* 搜索和筛选 */}
        <div className="flex items-center gap-4">
          <Input
            placeholder="搜索账号..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            startContent={<Search className="size-4 text-muted-foreground" />}
            className="max-w-xs"
          />
          <Dropdown>
            <DropdownTrigger>
              <Button
                variant="bordered"
                endContent={<ChevronDown className="size-4" />}>
                {selectedPlatform ? getPlatformName(selectedPlatform) : '全部平台'}
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              selectionMode="single"
              selectedKeys={selectedPlatform ? [selectedPlatform] : []}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string;
                setSelectedPlatform(selected || null);
              }}
              items={[{ id: '', name: '全部平台' }, ...platforms]}>
              {(item) => <DropdownItem key={item.id}>{item.name}</DropdownItem>}
            </DropdownMenu>
          </Dropdown>
        </div>

        {/* 账号列表 */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : filteredAccounts.length === 0 ? (
          <Card className="shadow-none border">
            <CardBody className="py-12">
              <div className="text-center space-y-2">
                <UserCircle className="size-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">
                  {searchQuery || selectedPlatform ? '没有找到匹配的账号' : '还没有添加任何账号'}
                </p>
                <Button
                  color="primary"
                  variant="flat"
                  onPress={onAddOpen}>
                  添加第一个账号
                </Button>
              </div>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(accountsByPlatform).map(([platform, platformAccounts]) => (
              <div key={platform}>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  {getPlatformName(platform)} ({platformAccounts.length})
                </h3>
                <div className="grid gap-3">
                  {platformAccounts.map((account) => (
                    <Card
                      key={account.id}
                      className="shadow-none border">
                      <CardBody>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar
                              src={account.avatar}
                              name={account.displayName || account.username}
                              size="md"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {account.displayName || account.username}
                                </span>
                                {account.isDefault && (
                                  <Chip
                                    size="sm"
                                    color="primary"
                                    variant="flat">
                                    默认
                                  </Chip>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">@{account.username}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Chip
                              size="sm"
                              color={account.isLoggedIn ? 'success' : 'warning'}
                              variant="flat">
                              {account.isLoggedIn ? '已登录' : '未登录'}
                            </Chip>
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
                                    case 'login':
                                      handleOpenLogin(account);
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
                                  key="login"
                                  startContent={<LogIn className="size-4" />}>
                                  {account.isLoggedIn ? '重新登录' : '登录'}
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
              </div>
            ))}
          </div>
        )}

        {/* 添加账号 Modal */}
        <Modal
          isOpen={isAddOpen}
          onClose={onAddClose}
          size="2xl">
          <ModalContent>
            <ModalHeader>添加账号</ModalHeader>
            <ModalBody className="max-h-[60vh] overflow-y-auto">
              <p className="text-muted-foreground mb-4">选择要添加的平台</p>
              <div className="grid grid-cols-3 gap-3">
                {platforms.map((platform) => (
                  <Card
                    key={platform.id}
                    isPressable
                    className="shadow-none border cursor-pointer hover:bg-muted/50"
                    onPress={() => handleAddAccount(platform.id)}>
                    <CardBody className="items-center py-4">
                      <span className="font-medium">{platform.name}</span>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                variant="light"
                onPress={onAddClose}>
                取消
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* 删除确认 Modal */}
        <Modal
          isOpen={isDeleteOpen}
          onClose={onDeleteClose}>
          <ModalContent>
            <ModalHeader>确认删除</ModalHeader>
            <ModalBody className="max-h-[60vh] overflow-y-auto">
              <p>
                确定要删除账号 <strong>{accountToDelete?.displayName || accountToDelete?.username}</strong>{' '}
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
