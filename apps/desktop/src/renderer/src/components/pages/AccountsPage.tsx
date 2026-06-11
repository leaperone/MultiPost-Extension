import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  CheckCircle,
  CheckCircle2,
  FolderPlus,
  LogIn,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trash2,
  Users,
  XCircle
} from 'lucide-react'
import {
  CONTENT_TYPE_LABELS,
  getPlatformAccountKey,
  PLATFORMS
} from '@shared/constants'
import type { Account, AccountGroup, PlatformType, SyncContentType } from '@shared/types'
import { PLATFORM_CATEGORIES, PlatformIcon } from '../publish/shared'
import { AccountAvatar } from '../AccountAvatar'
import {
  createProxyConfigDraft,
  proxyDraftToConfig,
  ProxyConfigSection,
  type ProxyConfigDraft
} from '../ProxyConfigSection'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { SimpleSelect } from '../ui/select'
import { Tooltip } from '../ui/tooltip'
import { ConfirmDialog } from '../ui/confirm-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../ui/dialog'
import { toast } from '../ui/sonner'

interface AccountsPageProps {
  onLoginAccount?: (account: Account) => void
}

type ContentTypeFilter = 'ALL' | SyncContentType

type StatusFilter = 'all' | 'online' | 'offline'

const STATUS_FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: 'all', label: '全部状态' },
  { key: 'online', label: '已登录' },
  { key: 'offline', label: '未登录' }
]

const CONTENT_TYPE_FILTERS: Array<{ key: ContentTypeFilter; label: string }> = [
  { key: 'ALL', label: '全部' },
  { key: 'DYNAMIC', label: CONTENT_TYPE_LABELS.DYNAMIC },
  { key: 'VIDEO', label: CONTENT_TYPE_LABELS.VIDEO },
  { key: 'ARTICLE', label: CONTENT_TYPE_LABELS.ARTICLE },
  { key: 'PODCAST', label: CONTENT_TYPE_LABELS.PODCAST }
]

// Radix Select reserves the empty string, so "ungrouped" needs a sentinel value
const UNGROUPED_VALUE = '__ungrouped__'

function getPlatformContentTypes(platform: PlatformType): SyncContentType[] {
  return PLATFORMS[platform]?.supportedContentTypes || []
}

function getAccountLabel(account: Account): string {
  return account.displayName || account.username || '未命名账号'
}

function PlatformContentBadges({ platform }: { platform: PlatformType }): React.ReactElement {
  return (
    <div className="flex flex-wrap gap-1.5">
      {getPlatformContentTypes(platform).map((contentType) => (
        <Badge key={contentType} size="sm" variant="outline">
          {CONTENT_TYPE_LABELS[contentType]}
        </Badge>
      ))}
    </div>
  )
}

function SearchInput({
  value,
  onChange,
  placeholder,
  className
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  className?: string
}): React.ReactElement {
  return (
    <div className={`relative ${className || ''}`}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="pl-8"
      />
    </div>
  )
}

export function AccountsPage({ onLoginAccount }: AccountsPageProps): React.ReactElement {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [groups, setGroups] = useState<AccountGroup[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false)
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false)
  const [isEditAccountOpen, setIsEditAccountOpen] = useState(false)

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

  // Destructive actions go through a confirm dialog (deleting an account also
  // clears its login session, so it must never be one accidental click away).
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null)
  const [groupToDelete, setGroupToDelete] = useState<AccountGroup | null>(null)

  // List filters (platform rail + toolbar), modeled after mature account managers
  const [platformFilter, setPlatformFilter] = useState<PlatformType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [accountSearch, setAccountSearch] = useState('')
  const [railSearch, setRailSearch] = useState('')

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
      toast.error('无法加载账号列表', { description: '请稍后重试，若持续失败请重启应用' })
    } finally {
      setLoading(false)
    }
  }, [selectedGroup])

  useEffect(() => {
    loadData()
  }, [loadData])

  // The main process re-detects accounts in the background (e.g. right after
  // a login tab closes); merge those updates into the list live.
  useEffect(() => {
    return window.api.account.onUpdated((updated) => {
      setAccounts((prev) =>
        prev.map((account) => (account.id === updated.id ? updated : account))
      )
    })
  }, [])

  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set())
  const [isRefreshingAll, setIsRefreshingAll] = useState(false)
  const [refreshAllProgress, setRefreshAllProgress] = useState({ done: 0, total: 0 })

  const handleRefreshAccount = useCallback(async (account: Account) => {
    setRefreshingIds((prev) => new Set(prev).add(account.id))
    try {
      const updated = await window.api.account.refreshInfo(account.id)
      if (updated) {
        setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
        if (updated.isLoggedIn) {
          toast(`已更新 ${updated.displayName || updated.username} 的账号信息`)
        } else {
          toast('未检测到登录', { description: '点击「去登录」完成平台登录' })
        }
      }
    } catch (error) {
      console.error('Failed to refresh account info:', error)
      toast.error('检测失败', {
        description: `${error instanceof Error ? error.message : '无法检测账号状态'}，请稍后重试`
      })
    } finally {
      setRefreshingIds((prev) => {
        const next = new Set(prev)
        next.delete(account.id)
        return next
      })
    }
  }, [])

  const handleRefreshAll = useCallback(async () => {
    if (accounts.length === 0) return
    setIsRefreshingAll(true)
    setRefreshAllProgress({ done: 0, total: accounts.length })
    try {
      const results = await Promise.allSettled(
        accounts.map((account) =>
          window.api.account.refreshInfo(account.id).finally(() => {
            setRefreshAllProgress((prev) => ({ ...prev, done: prev.done + 1 }))
          })
        )
      )
      const updatedAccounts = results
        .filter(
          (result): result is PromiseFulfilledResult<Account | null> =>
            result.status === 'fulfilled'
        )
        .map((result) => result.value)
        .filter((account): account is Account => Boolean(account))
      const failedCount = results.filter((result) => result.status === 'rejected').length

      setAccounts((prev) =>
        prev.map((account) => updatedAccounts.find((u) => u.id === account.id) || account)
      )
      const loggedIn = updatedAccounts.filter((account) => account.isLoggedIn).length
      toast(failedCount > 0 ? '检测完成（部分失败）' : '检测完成', {
        description:
          `共 ${accounts.length} 个账号，${loggedIn} 个在线` +
          (failedCount > 0 ? `，${failedCount} 个检测失败，可稍后重试` : '')
      })
    } catch (error) {
      console.error('Failed to refresh all accounts:', error)
    } finally {
      setIsRefreshingAll(false)
    }
  }, [accounts])

  const resetAddAccountForm = () => {
    setSelectedPlatform('')
    setPlatformSearch('')
    setContentTypeFilter('ALL')
    setNewAccountProxyDraft(createProxyConfigDraft())
  }

  const closeAddAccountModal = () => {
    setIsAddAccountOpen(false)
    resetAddAccountForm()
  }

  // keepOpen keeps the dialog (and the platform selection) around so several
  // accounts of the same platform can be added back-to-back.
  const handleAddAccount = async (keepOpen: boolean) => {
    if (!selectedPlatform) return

    try {
      const account = await window.api.account.create(selectedPlatform, {
        proxyConfig: proxyDraftToConfig(newAccountProxyDraft)
      })
      setAccounts((prev) => [account, ...prev])
      if (!keepOpen) {
        closeAddAccountModal()
      }
      toast(`已添加 ${PLATFORMS[selectedPlatform]?.name || selectedPlatform} 账号`, {
        description: keepOpen ? '可以继续添加下一个账号' : undefined
      })
    } catch (error) {
      console.error('Failed to add account:', error)
      toast.error('无法添加账号', { description: '请重试，若持续失败请重启应用' })
    }
  }

  const handleDeleteAccount = async (id: string) => {
    try {
      await window.api.account.delete(id)
      setAccounts((prev) => prev.filter((a) => a.id !== id))
      toast('账号已删除')
    } catch (error) {
      console.error('Failed to delete account:', error)
      toast.error('无法删除账号', { description: '请稍后重试' })
    }
  }

  const handleSetDefault = async (account: Account) => {
    try {
      await window.api.account.setDefault(account.id, account.platform)
      await loadData()
      toast(`已将 ${account.displayName || account.username} 设为默认账号`)
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
      setIsAddGroupOpen(false)
      setNewGroupName('')
      setNewGroupColor('')
      toast(`分组「${group.name}」已创建`)
    } catch (error) {
      console.error('Failed to add group:', error)
      toast.error('无法创建分组', { description: '请稍后重试' })
    }
  }

  const handleDeleteGroup = async (id: string) => {
    try {
      await window.api.group.delete(id)
      setGroups((prev) => prev.filter((g) => g.id !== id))
      if (selectedGroup === id) {
        setSelectedGroup(null)
      }
      toast('分组已删除')
    } catch (error) {
      console.error('Failed to delete group:', error)
      toast.error('无法删除分组', { description: '请稍后重试' })
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
    setIsEditAccountOpen(true)
  }

  const handleSaveAccountName = async () => {
    if (!editingAccount) return

    try {
      await window.api.account.update(editingAccount.id, {
        displayName: editDisplayName.trim() || undefined,
        proxyConfig: proxyDraftToConfig(editProxyDraft)
      })
      await loadData()
      setIsEditAccountOpen(false)
      setEditingAccount(null)
      toast('账号信息已保存')
    } catch (error) {
      console.error('Failed to update account name:', error)
      toast.error('无法保存账号信息', { description: '请稍后重试' })
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

  // Platforms that actually have accounts, with counts, for the left rail
  const platformEntries = useMemo(() => {
    const counts = new Map<PlatformType, number>()
    for (const account of accounts) {
      counts.set(account.platform, (counts.get(account.platform) || 0) + 1)
    }
    const query = railSearch.trim().toLowerCase()
    return Array.from(counts.entries())
      .map(([platform, count]) => ({
        platform,
        count,
        name: PLATFORMS[platform]?.name || platform
      }))
      .filter(
        (entry) =>
          !query ||
          entry.name.toLowerCase().includes(query) ||
          entry.platform.toLowerCase().includes(query)
      )
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-Hans-CN'))
  }, [accounts, railSearch])

  const visibleAccounts = useMemo(() => {
    const query = accountSearch.trim().toLowerCase()
    return accounts.filter((account) => {
      if (platformFilter !== 'all' && account.platform !== platformFilter) return false
      if (statusFilter === 'online' && !account.isLoggedIn) return false
      if (statusFilter === 'offline' && account.isLoggedIn) return false
      if (query) {
        const label = getAccountLabel(account).toLowerCase()
        const username = (account.username || '').toLowerCase()
        if (!label.includes(query) && !username.includes(query)) return false
      }
      return true
    })
  }, [accounts, platformFilter, statusFilter, accountSearch])

  const groupSelectOptions = useMemo(
    () => [
      { value: UNGROUPED_VALUE, label: '未分组' },
      ...groups.map((g) => ({ value: g.id, label: g.name }))
    ],
    [groups]
  )

  return (
    <div className="flex h-full min-h-0">
      {/* 左侧：平台 / 分组筛选栏 */}
      <aside className="flex w-60 shrink-0 flex-col gap-4 overflow-y-auto border-r p-4">
        <SearchInput value={railSearch} onChange={setRailSearch} placeholder="搜索平台" />

        <div className="flex flex-col gap-0.5">
          <span className="px-2.5 pb-1 text-xs font-medium text-muted-foreground">平台</span>
          <button
            type="button"
            onClick={() => setPlatformFilter('all')}
            className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-sm transition-colors ${
              platformFilter === 'all'
                ? 'bg-foreground/[0.06] font-medium'
                : 'hover:bg-foreground/[0.03]'
            }`}
          >
            <span className="flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              全部平台
            </span>
            <span className="text-xs tabular-nums text-muted-foreground">{accounts.length}</span>
          </button>
          {platformEntries.map((entry) => (
            <button
              key={entry.platform}
              type="button"
              onClick={() => setPlatformFilter(entry.platform)}
              className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-sm transition-colors ${
                platformFilter === entry.platform
                  ? 'bg-foreground/[0.06] font-medium'
                  : 'hover:bg-foreground/[0.03]'
              }`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <PlatformIcon platform={entry.platform} size={16} />
                <span className="truncate">{entry.name}</span>
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">{entry.count}</span>
            </button>
          ))}
          {platformEntries.length === 0 && accounts.length > 0 && (
            <span className="px-2.5 py-2 text-xs text-muted-foreground">没有匹配的平台</span>
          )}
        </div>

        <div className="flex flex-col gap-0.5">
          <div className="flex items-center justify-between px-2.5 pb-1">
            <span className="text-xs font-medium text-muted-foreground">分组</span>
            <Tooltip content="新建分组">
              <button
                type="button"
                onClick={() => setIsAddGroupOpen(true)}
                aria-label="新建分组"
                className="rounded p-1 text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
              >
                <FolderPlus className="size-3.5" />
              </button>
            </Tooltip>
          </div>
          <button
            type="button"
            onClick={() => setSelectedGroup(null)}
            className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors ${
              selectedGroup === null
                ? 'bg-foreground/[0.06] font-medium'
                : 'hover:bg-foreground/[0.03]'
            }`}
          >
            全部分组
          </button>
          {groups.map((group) => (
            <div
              key={group.id}
              className={`group flex items-center rounded-lg transition-colors ${
                selectedGroup === group.id ? 'bg-foreground/[0.06]' : 'hover:bg-foreground/[0.03]'
              }`}
            >
              <button
                type="button"
                onClick={() => setSelectedGroup(group.id)}
                className={`flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 text-left text-sm ${
                  selectedGroup === group.id ? 'font-medium' : ''
                }`}
              >
                {group.color && (
                  <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: group.color }} />
                )}
                <span className="truncate">{group.name}</span>
              </button>
              <button
                type="button"
                className="mr-1.5 rounded p-0.5 opacity-0 transition-opacity hover:bg-foreground/[0.08] group-hover:opacity-100"
                onClick={() => setGroupToDelete(group)}
                aria-label={`删除分组 ${group.name}`}
                title="删除分组"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          ))}
          {groups.length === 0 && (
            <span className="px-2.5 py-1 text-xs text-muted-foreground">暂无分组</span>
          )}
        </div>
      </aside>

      {/* 主区：工具栏 + 账号列表 */}
      <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">账号管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {accountStats.total} 个账号 · {accountStats.loggedIn} 个已登录 ·{' '}
            {accountStats.platformCount} 个平台
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SimpleSelect
            value={statusFilter}
            onValueChange={(value) => setStatusFilter((value as StatusFilter) || 'all')}
            options={STATUS_FILTERS.map((filter) => ({ value: filter.key, label: filter.label }))}
            className="h-8 w-32 shrink-0 text-xs"
          />
          <SearchInput
            value={accountSearch}
            onChange={setAccountSearch}
            placeholder="搜索账号名称"
            className="w-56"
          />
          <div className="flex-1" />
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefreshAll}
            isLoading={isRefreshingAll}
            disabled={accounts.length === 0}
          >
            {!isRefreshingAll && <RefreshCw />}
            {isRefreshingAll
              ? `检测中 ${refreshAllProgress.done}/${refreshAllProgress.total}`
              : '检测全部'}
          </Button>
          <Button size="sm" onClick={() => setIsAddAccountOpen(true)}>
            <Plus />
            添加账号
          </Button>
        </div>

        {loading ? (
          <div className="flex h-56 items-center justify-center rounded-lg bg-muted">
            <span className="text-sm text-muted-foreground">加载中...</span>
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex h-72 flex-col items-center justify-center gap-4 rounded-lg bg-muted">
            <div className="flex size-14 items-center justify-center rounded-full bg-background text-muted-foreground">
              <Users className="size-7" />
            </div>
            <div className="text-center">
              <p className="font-medium">暂无账号</p>
              <p className="text-sm text-muted-foreground">选择平台后会创建独立登录会话</p>
            </div>
            <Button size="sm" onClick={() => setIsAddAccountOpen(true)}>
              <Plus />
              添加第一个账号
            </Button>
          </div>
        ) : visibleAccounts.length === 0 ? (
          <div className="flex h-56 flex-col items-center justify-center gap-2 rounded-lg bg-muted text-muted-foreground">
            <Search className="size-7" />
            <span className="text-sm">没有匹配的账号，试试调整筛选条件</span>
          </div>
        ) : (
          <Card className="overflow-hidden">
            <div className="grid grid-cols-[minmax(0,2.4fr)_minmax(0,1.1fr)_160px_148px] items-center gap-3 border-b bg-foreground/[0.02] px-4 py-2.5 text-xs font-medium text-muted-foreground">
              <span>账号信息</span>
              <span>平台</span>
              <span>分组</span>
              <span className="text-right">操作</span>
            </div>
            <div className="divide-y">
              {visibleAccounts.map((account) => {
                const platformInfo = PLATFORMS[account.platform]
                const accountLabel = getAccountLabel(account)

                return (
                  <div
                    key={account.id}
                    className="grid grid-cols-[minmax(0,2.4fr)_minmax(0,1.1fr)_160px_148px] items-center gap-3 px-4 py-3 transition-colors hover:bg-foreground/[0.02]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <AccountAvatar
                        avatar={account.avatar}
                        platform={account.platform}
                        size={40}
                      />
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <button
                            className="truncate text-left text-sm font-medium hover:underline"
                            onClick={() => handleEditAccount(account)}
                            title="点击编辑名称"
                          >
                            {accountLabel}
                          </button>
                          {account.isDefault && (
                            <Badge variant="outline" size="sm" className="shrink-0">
                              默认
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          {account.isLoggedIn ? (
                            <span className="inline-flex items-center gap-1 text-xs text-foreground">
                              <CheckCircle className="size-3.5" />
                              已登录
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <XCircle className="size-3.5" />
                              未登录
                            </span>
                          )}
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline"
                            onClick={() => onLoginAccount?.(account)}
                          >
                            <LogIn className="size-3" />
                            {account.isLoggedIn ? '重新登录' : '去登录'}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex min-w-0 items-center gap-2">
                      <PlatformIcon platform={account.platform} size={18} />
                      <span className="truncate text-sm">
                        {platformInfo?.name || account.platform}
                      </span>
                    </div>

                    <SimpleSelect
                      value={account.groupId || UNGROUPED_VALUE}
                      onValueChange={(value) =>
                        handleAssignGroup(account.id, value === UNGROUPED_VALUE ? null : value)
                      }
                      options={groupSelectOptions}
                      placeholder="未分组"
                      className="h-8 text-xs"
                    />

                    <div className="flex items-center justify-end gap-0.5">
                      <Tooltip content="检测登录状态">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label="检测登录状态"
                          onClick={() => handleRefreshAccount(account)}
                          isLoading={refreshingIds.has(account.id)}
                        >
                          {!refreshingIds.has(account.id) && <RefreshCw />}
                        </Button>
                      </Tooltip>
                      {!account.isDefault && (
                        <Tooltip content="设为默认">
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label="设为默认"
                            onClick={() => handleSetDefault(account)}
                          >
                            <Star />
                          </Button>
                        </Tooltip>
                      )}
                      <Tooltip content="编辑账号">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label="编辑账号"
                          onClick={() => handleEditAccount(account)}
                        >
                          <Pencil />
                        </Button>
                      </Tooltip>
                      <Tooltip content="删除账号">
                        <Button
                          size="icon-sm"
                          variant="destructive-ghost"
                          aria-label="删除账号"
                          onClick={() => setAccountToDelete(account)}
                        >
                          <Trash2 />
                        </Button>
                      </Tooltip>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {/* Add Account Dialog */}
        <Dialog
          open={isAddAccountOpen}
          onOpenChange={(open) => {
            if (!open) closeAddAccountModal()
          }}
        >
          <DialogContent className="max-w-[920px]">
            <DialogHeader>
              <DialogTitle>添加账号</DialogTitle>
              <DialogDescription>选择一个账号平台并配置独立代理</DialogDescription>
            </DialogHeader>
            <div className="flex max-h-[60vh] min-h-0 flex-col gap-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <SearchInput
                  value={platformSearch}
                  onChange={setPlatformSearch}
                  placeholder="搜索平台或账号"
                  className="lg:w-72"
                />
                <div className="flex flex-wrap gap-2">
                  {CONTENT_TYPE_FILTERS.map((filter) => (
                    <Button
                      key={filter.key}
                      size="sm"
                      variant={contentTypeFilter === filter.key ? 'default' : 'outline'}
                      onClick={() => setContentTypeFilter(filter.key)}
                    >
                      {filter.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto rounded-lg bg-foreground/[0.03] p-3">
                {filteredPlatformsByCategory.length === 0 ? (
                  <div className="flex h-44 flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Search className="size-8" />
                    <span className="text-sm">没有匹配的平台</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-5">
                    {filteredPlatformsByCategory.map((category) => (
                      <div key={category.id}>
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">
                            {category.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
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
                                className={`flex min-h-28 items-start gap-3 rounded-lg p-3 text-left transition-colors ${
                                  isSelected
                                    ? 'bg-primary/10 ring-1 ring-primary/40'
                                    : 'bg-background hover:bg-foreground/[0.02]'
                                }`}
                              >
                                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted">
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
                                  <div className="mt-1 truncate text-xs text-muted-foreground">
                                    {accountKey}
                                  </div>
                                  <div className="mt-2">
                                    <PlatformContentBadges platform={platform} />
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
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={closeAddAccountModal}>
                取消
              </Button>
              <Button
                variant="outline"
                onClick={() => handleAddAccount(true)}
                disabled={!selectedPlatform}
              >
                添加并继续
              </Button>
              <Button onClick={() => handleAddAccount(false)} disabled={!selectedPlatform}>
                添加
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Group Dialog */}
        <Dialog open={isAddGroupOpen} onOpenChange={setIsAddGroupOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建分组</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <Input
                label="分组名称"
                placeholder="输入分组名称"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
              <Input
                type="color"
                label="分组颜色（可选）"
                className="w-16 p-1"
                value={newGroupColor || '#a3a3a3'}
                onChange={(e) => setNewGroupColor(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsAddGroupOpen(false)}>
                取消
              </Button>
              <Button onClick={handleAddGroup} disabled={!newGroupName.trim()}>
                创建
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Account Dialog */}
        <Dialog open={isEditAccountOpen} onOpenChange={setIsEditAccountOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>编辑账号</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
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
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsEditAccountOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSaveAccountName}>保存</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete account confirm */}
        <ConfirmDialog
          open={accountToDelete !== null}
          onOpenChange={(open) => {
            if (!open) setAccountToDelete(null)
          }}
          title={`删除账号「${accountToDelete ? getAccountLabel(accountToDelete) : ''}」？`}
          description="将同时清除该账号的登录会话，删除后需重新登录。"
          confirmText="删除"
          onConfirm={async () => {
            if (accountToDelete) await handleDeleteAccount(accountToDelete.id)
          }}
        />

        {/* Delete group confirm */}
        <ConfirmDialog
          open={groupToDelete !== null}
          onOpenChange={(open) => {
            if (!open) setGroupToDelete(null)
          }}
          title={`删除分组「${groupToDelete?.name || ''}」？`}
          description="组内账号不会被删除，会变为未分组。"
          confirmText="删除"
          onConfirm={async () => {
            if (groupToDelete) await handleDeleteGroup(groupToDelete.id)
          }}
        />
      </div>
    </div>
  )
}
