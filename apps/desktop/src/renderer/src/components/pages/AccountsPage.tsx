import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  CheckCircle2,
  Circle,
  FolderPlus,
  KeyRound,
  LogIn,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  Users
} from 'lucide-react'
import { Button } from '@heroui/react'
import { Card, CardBody, CardHeader } from '@heroui/react'
import { Avatar } from '@heroui/react'
import { Chip } from '@heroui/react'
import { Tabs, Tab } from '@heroui/react'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure
} from '@heroui/react'
import { Input } from '@heroui/react'
import { Select, SelectItem } from '@heroui/react'
import { addToast } from '@heroui/react'
import {
  CONTENT_TYPE_LABELS,
  getPlatformAccountKey,
  PLATFORMS
} from '@shared/constants'
import type { Account, AccountGroup, PlatformType, SyncContentType } from '@shared/types'
import { PLATFORM_CATEGORIES, PlatformIcon } from '../publish/shared'
import {
  createProxyConfigDraft,
  proxyDraftToConfig,
  ProxyConfigSection,
  type ProxyConfigDraft
} from '../ProxyConfigSection'

interface AccountsPageProps {
  onLoginAccount?: (account: Account) => void
}

type ContentTypeFilter = 'ALL' | SyncContentType

const CONTENT_TYPE_FILTERS: Array<{ key: ContentTypeFilter; label: string }> = [
  { key: 'ALL', label: '全部' },
  { key: 'DYNAMIC', label: CONTENT_TYPE_LABELS.DYNAMIC },
  { key: 'VIDEO', label: CONTENT_TYPE_LABELS.VIDEO },
  { key: 'ARTICLE', label: CONTENT_TYPE_LABELS.ARTICLE },
  { key: 'PODCAST', label: CONTENT_TYPE_LABELS.PODCAST }
]

function getPlatformContentTypes(platform: PlatformType): SyncContentType[] {
  return PLATFORMS[platform]?.supportedContentTypes || []
}

function getAccountLabel(account: Account): string {
  return account.displayName || account.username || '未命名账号'
}

function PlatformContentChips({ platform }: { platform: PlatformType }): React.ReactElement {
  return (
    <div className="flex flex-wrap gap-1.5">
      {getPlatformContentTypes(platform).map((contentType) => (
        <Chip key={contentType} size="sm" variant="flat" className="h-6 px-1">
          {CONTENT_TYPE_LABELS[contentType]}
        </Chip>
      ))}
    </div>
  )
}

export function AccountsPage({ onLoginAccount }: AccountsPageProps): React.ReactElement {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [groups, setGroups] = useState<AccountGroup[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const { isOpen: isAddAccountOpen, onOpen: onAddAccountOpen, onClose: onAddAccountClose } = useDisclosure()
  const { isOpen: isAddGroupOpen, onOpen: onAddGroupOpen, onClose: onAddGroupClose } = useDisclosure()
  const { isOpen: isEditAccountOpen, onOpen: onEditAccountOpen, onClose: onEditAccountClose } = useDisclosure()

  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupColor, setNewGroupColor] = useState('')
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType | ''>('')
  const [platformSearch, setPlatformSearch] = useState('')
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentTypeFilter>('ALL')
  const [newAccountProxyDraft, setNewAccountProxyDraft] = useState<ProxyConfigDraft>(() =>
    createProxyConfigDraft()
  )
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [editDisplayName, setEditDisplayName] = useState('')
  const [editProxyDraft, setEditProxyDraft] = useState<ProxyConfigDraft>(() =>
    createProxyConfigDraft()
  )

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [accountsData, groupsData] = await Promise.all([
        window.api.account.list(selectedGroup ? { groupId: selectedGroup } : undefined),
        window.api.group.list()
      ])
      setAccounts(accountsData)
      setGroups(groupsData)
    } catch (error) {
      console.error('Failed to load accounts:', error)
      addToast({
        title: '加载失败',
        description: '无法加载账号列表',
        hideIcon: true
      })
    } finally {
      setLoading(false)
    }
  }, [selectedGroup])

  useEffect(() => {
    loadData()
  }, [loadData])

  const closeAddAccountModal = () => {
    onAddAccountClose()
    setSelectedPlatform('')
    setPlatformSearch('')
    setContentTypeFilter('ALL')
    setNewAccountProxyDraft(createProxyConfigDraft())
  }

  const handleAddAccount = async () => {
    if (!selectedPlatform) return

    try {
      const account = await window.api.account.create(selectedPlatform, {
        proxyConfig: proxyDraftToConfig(newAccountProxyDraft)
      })
      setAccounts((prev) => [account, ...prev])
      closeAddAccountModal()
      addToast({
        title: '添加成功',
        description: `已添加 ${PLATFORMS[selectedPlatform]?.name || selectedPlatform} 账号`,
        hideIcon: true
      })
    } catch (error) {
      console.error('Failed to add account:', error)
      addToast({
        title: '添加失败',
        description: '无法添加账号',
        hideIcon: true
      })
    }
  }

  const handleDeleteAccount = async (id: string) => {
    try {
      await window.api.account.delete(id)
      setAccounts((prev) => prev.filter((a) => a.id !== id))
      addToast({
        title: '删除成功',
        description: '账号已删除',
        hideIcon: true
      })
    } catch (error) {
      console.error('Failed to delete account:', error)
      addToast({
        title: '删除失败',
        description: '无法删除账号',
        hideIcon: true
      })
    }
  }

  const handleSetDefault = async (account: Account) => {
    try {
      await window.api.account.setDefault(account.id, account.platform)
      await loadData()
      addToast({
        title: '设置成功',
        description: `已将 ${account.displayName || account.username} 设为默认账号`,
        hideIcon: true
      })
    } catch (error) {
      console.error('Failed to set default:', error)
    }
  }

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) return

    try {
      const group = await window.api.group.create({
        name: newGroupName.trim(),
        color: newGroupColor || undefined
      })
      setGroups((prev) => [...prev, group])
      onAddGroupClose()
      setNewGroupName('')
      setNewGroupColor('')
      addToast({
        title: '创建成功',
        description: `分组 "${group.name}" 已创建`,
        hideIcon: true
      })
    } catch (error) {
      console.error('Failed to add group:', error)
      addToast({
        title: '创建失败',
        description: '无法创建分组',
        hideIcon: true
      })
    }
  }

  const handleDeleteGroup = async (id: string) => {
    try {
      await window.api.group.delete(id)
      setGroups((prev) => prev.filter((g) => g.id !== id))
      if (selectedGroup === id) {
        setSelectedGroup(null)
      }
      addToast({
        title: '删除成功',
        description: '分组已删除',
        hideIcon: true
      })
    } catch (error) {
      console.error('Failed to delete group:', error)
    }
  }

  const handleAssignGroup = async (accountId: string, groupId: string | null) => {
    try {
      await window.api.account.update(accountId, { groupId: groupId || undefined })
      await loadData()
    } catch (error) {
      console.error('Failed to assign group:', error)
    }
  }

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account)
    setEditDisplayName(account.displayName || account.username || '')
    setEditProxyDraft(createProxyConfigDraft(account.proxyConfig))
    onEditAccountOpen()
  }

  const handleSaveAccountName = async () => {
    if (!editingAccount) return

    try {
      await window.api.account.update(editingAccount.id, {
        displayName: editDisplayName.trim() || undefined,
        proxyConfig: proxyDraftToConfig(editProxyDraft)
      })
      await loadData()
      onEditAccountClose()
      setEditingAccount(null)
      addToast({
        title: '保存成功',
        description: '账号名称已更新',
        hideIcon: true
      })
    } catch (error) {
      console.error('Failed to update account name:', error)
      addToast({
        title: '保存失败',
        description: '无法更新账号名称',
        hideIcon: true
      })
    }
  }

  const accountStats = useMemo(() => {
    const loggedInCount = accounts.filter((account) => account.isLoggedIn).length
    const platformCount = new Set(accounts.map((account) => account.platform)).size

    return {
      total: accounts.length,
      loggedIn: loggedInCount,
      platformCount,
      groups: groups.length
    }
  }, [accounts, groups])

  const filteredPlatformsByCategory = useMemo(() => {
    const query = platformSearch.trim().toLowerCase()
    const allPlatformIds = Object.keys(PLATFORMS) as PlatformType[]

    const visiblePlatformIds = allPlatformIds.filter((platform) => {
      const platformInfo = PLATFORMS[platform]
      const contentTypes = getPlatformContentTypes(platform)
      const accountKey = getPlatformAccountKey(platform)
      const matchesContentType =
        contentTypeFilter === 'ALL' || contentTypes.includes(contentTypeFilter)
      const matchesQuery =
        !query ||
        platformInfo.name.toLowerCase().includes(query) ||
        platform.toLowerCase().includes(query) ||
        accountKey.toLowerCase().includes(query)

      return matchesContentType && matchesQuery
    })

    const categorized = PLATFORM_CATEGORIES.map((category) => ({
      ...category,
      platforms: category.platforms.filter((platform) => visiblePlatformIds.includes(platform))
    })).filter((category) => category.platforms.length > 0)

    const categorizedIds = new Set(categorized.flatMap((category) => category.platforms))
    const otherPlatforms = visiblePlatformIds.filter((platform) => !categorizedIds.has(platform))

    if (otherPlatforms.length > 0) {
      categorized.push({
        id: 'other',
        name: '其他平台',
        platforms: otherPlatforms
      })
    }

    return categorized
  }, [contentTypeFilter, platformSearch])

  return (
    <div className="flex h-full flex-col gap-5 overflow-auto bg-default-50/40 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl border bg-background text-primary">
              <KeyRound className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal">账号管理</h1>
              <p className="text-sm text-default-500">管理登录状态、默认账号、分组和代理配置</p>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="bordered" onPress={onAddGroupOpen}>
            <FolderPlus className="size-4" />
            新建分组
          </Button>
          <Button size="sm" color="primary" onPress={onAddAccountOpen}>
            <Plus className="size-4" />
            添加账号
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="rounded-lg border bg-background p-4">
          <div className="flex items-center justify-between text-default-500">
            <span className="text-xs">账号</span>
            <Users className="size-4" />
          </div>
          <div className="mt-2 text-2xl font-semibold">{accountStats.total}</div>
        </div>
        <div className="rounded-lg border bg-background p-4">
          <div className="flex items-center justify-between text-default-500">
            <span className="text-xs">已登录</span>
            <CheckCircle2 className="size-4 text-success" />
          </div>
          <div className="mt-2 text-2xl font-semibold">{accountStats.loggedIn}</div>
        </div>
        <div className="rounded-lg border bg-background p-4">
          <div className="flex items-center justify-between text-default-500">
            <span className="text-xs">平台</span>
            <ShieldCheck className="size-4" />
          </div>
          <div className="mt-2 text-2xl font-semibold">{accountStats.platformCount}</div>
        </div>
        <div className="rounded-lg border bg-background p-4">
          <div className="flex items-center justify-between text-default-500">
            <span className="text-xs">分组</span>
            <FolderPlus className="size-4" />
          </div>
          <div className="mt-2 text-2xl font-semibold">{accountStats.groups}</div>
        </div>
      </div>

      <Tabs
        selectedKey={selectedGroup || 'all'}
        onSelectionChange={(key) => setSelectedGroup(key === 'all' ? null : String(key))}
        classNames={{
          tabList: 'bg-background border',
          cursor: 'bg-primary',
          tabContent: 'group-data-[selected=true]:text-primary-foreground'
        }}
      >
        <Tab key="all" title={`全部 ${accountStats.total}`} />
        {groups.map((group) => (
          <Tab
            key={group.id}
            title={
              <div className="flex items-center gap-2">
                {group.color && (
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: group.color }}
                  />
                )}
                <span>{group.name}</span>
                <button
                  className="ml-1 rounded p-0.5 opacity-50 hover:bg-background/30 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteGroup(group.id)
                  }}
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            }
          />
        ))}
      </Tabs>

      {loading ? (
        <div className="flex h-56 items-center justify-center rounded-lg border bg-background">
          <span className="text-sm text-default-500">加载中...</span>
        </div>
      ) : accounts.length === 0 ? (
        <div className="flex h-72 flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-background">
          <div className="flex size-14 items-center justify-center rounded-xl bg-default-100 text-default-500">
            <Users className="size-7" />
          </div>
          <div className="text-center">
            <p className="font-medium">暂无账号</p>
            <p className="text-sm text-default-500">选择平台后会创建独立登录会话</p>
          </div>
          <Button size="sm" color="primary" onPress={onAddAccountOpen}>
            <Plus className="size-4" />
            添加第一个账号
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {accounts.map((account) => {
            const platformInfo = PLATFORMS[account.platform]
            const accountLabel = getAccountLabel(account)

            return (
              <Card key={account.id} className="border shadow-none">
                <CardHeader className="flex flex-row items-start gap-4 pb-3">
                  <div className="relative shrink-0">
                    <Avatar src={account.avatar} name={accountLabel} size="lg" />
                    <div className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-md border bg-background">
                      <PlatformIcon platform={account.platform} size={15} />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <button
                        className="truncate text-left text-base font-semibold hover:underline"
                        onClick={() => handleEditAccount(account)}
                        title="点击编辑名称"
                      >
                        {accountLabel}
                      </button>
                      <Button
                        size="sm"
                        variant="light"
                        isIconOnly
                        className="h-7 min-w-7"
                        onPress={() => handleEditAccount(account)}
                        title="编辑名称"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      {account.isDefault && (
                        <Chip size="sm" color="warning" variant="flat" className="shrink-0">
                          默认
                        </Chip>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-small text-default-500">
                      <span>{platformInfo?.name || account.platform}</span>
                      <span className="text-default-300">/</span>
                      <span>{getPlatformAccountKey(account.platform)}</span>
                    </div>
                    <div className="mt-3">
                      <PlatformContentChips platform={account.platform} />
                    </div>
                  </div>
                  <Chip
                    size="sm"
                    color={account.isLoggedIn ? 'success' : 'default'}
                    variant="flat"
                    className="shrink-0"
                  >
                    <span className="inline-flex items-center gap-1">
                      {account.isLoggedIn ? (
                        <CheckCircle2 className="size-3.5" />
                      ) : (
                        <Circle className="size-3.5" />
                      )}
                      {account.isLoggedIn ? '已登录' : '未登录'}
                    </span>
                  </Chip>
                </CardHeader>
                <CardBody className="pt-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="bordered"
                      color={account.isLoggedIn ? 'default' : 'primary'}
                      onPress={() => onLoginAccount?.(account)}
                      startContent={<LogIn className="size-4" />}
                    >
                      {account.isLoggedIn ? '重新登录' : '去登录'}
                    </Button>
                    <Select
                      size="sm"
                      placeholder="分组"
                      selectedKeys={account.groupId ? [account.groupId] : []}
                      onChange={(e) => handleAssignGroup(account.id, e.target.value || null)}
                      className="w-36"
                    >
                      {groups.map((g) => (
                        <SelectItem key={g.id}>{g.name}</SelectItem>
                      ))}
                    </Select>
                    <div className="flex-1" />
                    {!account.isDefault && (
                      <Button
                        size="sm"
                        variant="light"
                        isIconOnly
                        onPress={() => handleSetDefault(account)}
                        title="设为默认"
                      >
                        <Star className="size-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="light"
                      color="danger"
                      isIconOnly
                      onPress={() => handleDeleteAccount(account.id)}
                      title="删除账号"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Account Modal */}
      <Modal isOpen={isAddAccountOpen} onClose={closeAddAccountModal}>
        <ModalContent className="max-w-[920px]">
          <ModalHeader className="flex flex-col gap-1">
            <span>添加账号</span>
            <span className="text-sm font-normal text-default-500">选择一个账号平台并配置独立代理</span>
          </ModalHeader>
          <ModalBody className="flex max-h-[70vh] flex-col gap-4 overflow-hidden">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <Input
                value={platformSearch}
                onChange={(event) => setPlatformSearch(event.target.value)}
                placeholder="搜索平台或 accountKey"
                startContent={<Search className="size-4 text-default-400" />}
                className="lg:max-w-xs"
              />
              <div className="flex flex-wrap gap-2">
                {CONTENT_TYPE_FILTERS.map((filter) => (
                  <Button
                    key={filter.key}
                    size="sm"
                    variant={contentTypeFilter === filter.key ? 'solid' : 'bordered'}
                    color={contentTypeFilter === filter.key ? 'primary' : 'default'}
                    onPress={() => setContentTypeFilter(filter.key)}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto rounded-lg border bg-default-50/50 p-3">
              {filteredPlatformsByCategory.length === 0 ? (
                <div className="flex h-44 flex-col items-center justify-center gap-2 text-default-500">
                  <Search className="size-8" />
                  <span className="text-sm">没有匹配的平台</span>
                </div>
              ) : (
                <div className="space-y-5">
                  {filteredPlatformsByCategory.map((category) => (
                    <div key={category.id}>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-medium text-default-500">
                          {category.name}
                        </span>
                        <span className="text-xs text-default-400">
                          {category.platforms.length}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {category.platforms.map((platform) => {
                          const platformInfo = PLATFORMS[platform]
                          const isSelected = selectedPlatform === platform
                          const accountKey = getPlatformAccountKey(platform)

                          return (
                            <button
                              key={platform}
                              type="button"
                              onClick={() => setSelectedPlatform(platform)}
                              className={`flex min-h-28 items-start gap-3 rounded-lg border bg-background p-3 text-left transition-all ${
                                isSelected
                                  ? 'border-primary shadow-sm ring-1 ring-primary/30'
                                  : 'hover:border-default-400'
                              }`}
                            >
                              <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border bg-default-50">
                                <PlatformIcon platform={platform} size={24} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex min-w-0 items-center gap-2">
                                  <span className="truncate text-sm font-semibold">
                                    {platformInfo?.name || platform}
                                  </span>
                                  {isSelected && (
                                    <CheckCircle2 className="size-4 shrink-0 text-primary" />
                                  )}
                                </div>
                                <div className="mt-1 truncate text-xs text-default-500">
                                  {accountKey}
                                </div>
                                <div className="mt-2">
                                  <PlatformContentChips platform={platform} />
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <ProxyConfigSection
              value={newAccountProxyDraft}
              onChange={setNewAccountProxyDraft}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={closeAddAccountModal}>
              取消
            </Button>
            <Button color="primary" onPress={handleAddAccount} isDisabled={!selectedPlatform}>
              添加
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add Group Modal */}
      <Modal isOpen={isAddGroupOpen} onClose={onAddGroupClose}>
        <ModalContent>
          <ModalHeader>新建分组</ModalHeader>
          <ModalBody className="flex flex-col gap-4">
            <Input
              label="分组名称"
              placeholder="输入分组名称"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
            />
            <Input
              type="color"
              label="分组颜色（可选）"
              value={newGroupColor}
              onChange={(e) => setNewGroupColor(e.target.value)}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onAddGroupClose}>
              取消
            </Button>
            <Button color="primary" onPress={handleAddGroup} isDisabled={!newGroupName.trim()}>
              创建
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Account Modal */}
      <Modal isOpen={isEditAccountOpen} onClose={onEditAccountClose}>
        <ModalContent>
          <ModalHeader>编辑账号</ModalHeader>
          <ModalBody className="flex flex-col gap-4">
            <Input
              label="显示名称"
              placeholder="输入账号显示名称"
              value={editDisplayName}
              onChange={(e) => setEditDisplayName(e.target.value)}
              autoFocus
            />
            <ProxyConfigSection
              key={editingAccount?.id || 'edit-proxy'}
              value={editProxyDraft}
              onChange={setEditProxyDraft}
              defaultExpanded={Boolean(editingAccount?.proxyConfig)}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onEditAccountClose}>
              取消
            </Button>
            <Button color="primary" onPress={handleSaveAccountName}>
              保存
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
