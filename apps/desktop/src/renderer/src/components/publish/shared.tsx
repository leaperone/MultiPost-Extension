import { Button, Card, Checkbox, Avatar, Chip } from '@heroui/react'
import {
  CheckCircle,
  XCircle,
  Circle,
  Loader2,
  Eye,
  StopCircle,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react'
import { Icon } from '@iconify/react'
import { useState, useEffect, useMemo, useCallback } from 'react'
import type { Account, PlatformType, SyncContentType } from '../../../../shared/types'
import { PLATFORMS } from '../../../../shared/constants'

// Platform icon component with fallback mechanism
export function PlatformIcon({ platform, size = 20 }: { platform: PlatformType; size?: number }) {
  const [iconError, setIconError] = useState(false)
  const [faviconError, setFaviconError] = useState(false)
  const platformInfo = PLATFORMS[platform]

  if (!platformInfo) return null

  // Get first letter for fallback
  const fallbackLetter = platformInfo.name.charAt(0).toUpperCase()
  const fallbackStyle = {
    width: size,
    height: size,
    fontSize: size * 0.6,
    lineHeight: `${size}px`
  }

  // Try iconify icon first
  if (platformInfo.iconifyIcon && !iconError) {
    return (
      <Icon
        icon={platformInfo.iconifyIcon}
        width={size}
        height={size}
        onError={() => setIconError(true)}
      />
    )
  }

  // Try favicon next
  if (platformInfo.faviconUrl && !faviconError) {
    return (
      <img
        src={platformInfo.faviconUrl}
        alt={platformInfo.name}
        width={size}
        height={size}
        className="rounded-sm object-contain"
        onError={() => setFaviconError(true)}
      />
    )
  }

  // Final fallback: first letter of platform name
  return (
    <div
      className="flex items-center justify-center rounded bg-muted text-muted-foreground font-medium"
      style={fallbackStyle}
    >
      {fallbackLetter}
    </div>
  )
}

export type PublishStatus = 'idle' | 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

// Legacy platform-based state (deprecated, use AccountPublishState instead)
export interface PlatformPublishState {
  platform: PlatformType
  status: PublishStatus
  message?: string
}

// New account-based state for multi-account support
export interface AccountPublishState {
  accountId: string
  platform: PlatformType
  displayName?: string
  status: PublishStatus
  message?: string
}

// Platform categories for better organization
export interface PlatformCategory {
  id: string
  name: string
  platforms: PlatformType[]
}

export const PLATFORM_CATEGORIES: PlatformCategory[] = [
  {
    id: 'featured',
    name: '常用平台',
    platforms: ['weibo', 'xiaohongshu', 'twitter', 'douyin', 'bilibili', 'zhihu', 'wechat']
  },
  {
    id: 'china-social',
    name: '国内社交',
    platforms: [
      'xueqiu',
      'okjike',
      'kuaishou',
      'baijiahao',
      'toutiao',
      'toutiaohao',
      'weixinchannel',
      'v2ex',
      'douban',
      'dedao',
      'zsxq',
      'xiaoheihe',
      'maimai',
      'juejin'
    ]
  },
  {
    id: 'international',
    name: '国际平台',
    platforms: [
      'instagram',
      'facebook',
      'linkedin',
      'reddit',
      'threads',
      'bluesky',
      'substack',
      'webhook'
    ]
  },
  {
    id: 'video',
    name: '视频平台',
    platforms: [
      'youtube',
      'tiktok',
      'eastmoney',
      'qie',
      'chejiahao',
      'dewu',
      'yiche',
      'sohu',
      'netease',
      'dayu',
      'alipay',
      'yidian',
      'pinduoduo',
      'vivovideo'
    ]
  },
  {
    id: 'article',
    name: '文章平台',
    platforms: ['csdn', 'jianshu', 'segmentfault', 'sspai', '51cto', 'wordpress']
  },
  {
    id: 'podcast',
    name: '播客平台',
    platforms: [
      'qqmusic',
      'lizhi',
      'ximalaya',
      'xiaoyuzhou',
      'qingting',
      'neteasepodcast',
      'spotify'
    ]
  }
]

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function getStatusIcon(status: PublishStatus): React.ReactNode {
  switch (status) {
    case 'pending':
      return <Circle className="size-4 text-default-400" />
    case 'processing':
      return <Loader2 className="size-4 text-primary animate-spin" />
    case 'completed':
      return <CheckCircle className="size-4 text-success" />
    case 'failed':
      return <XCircle className="size-4 text-danger" />
    case 'cancelled':
      return <StopCircle className="size-4 text-muted-foreground" />
    default:
      return null
  }
}

export function getDefaultMessage(status: PublishStatus): string {
  switch (status) {
    case 'pending':
      return '等待中'
    case 'processing':
      return '正在处理...'
    case 'completed':
      return '已发布'
    case 'failed':
      return '发生错误'
    case 'cancelled':
      return '已取消'
    default:
      return ''
  }
}

// Account selector component - allows selecting multiple accounts per platform
interface AccountSelectorProps {
  contentType: SyncContentType
  selectedAccountIds: Set<string> // Set of selected account IDs (supports multi-select per platform)
  onAccountToggle: (accountId: string) => void
  selectedOtherPlatforms?: Set<PlatformType> // platforms without saved accounts
  onOtherPlatformToggle?: (platform: PlatformType) => void
  isDisabled?: boolean
}

export function AccountSelector({
  contentType,
  selectedAccountIds,
  onAccountToggle,
  selectedOtherPlatforms = new Set(),
  onOtherPlatformToggle,
  isDisabled = false
}: AccountSelectorProps): React.ReactElement {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showOtherPlatforms, setShowOtherPlatforms] = useState(false)

  // Load accounts on mount
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const accountList = await window.api.account.list()
        setAccounts(accountList)
      } catch (error) {
        console.error('Failed to load accounts:', error)
      } finally {
        setLoading(false)
      }
    }
    loadAccounts()
  }, [])

  // Group accounts by platform and filter by content type support
  const accountsByPlatform = useMemo(() => {
    const grouped = new Map<PlatformType, Account[]>()
    for (const account of accounts) {
      const platformInfo = PLATFORMS[account.platform]
      if (platformInfo?.supportedContentTypes.includes(contentType)) {
        const existing = grouped.get(account.platform) || []
        grouped.set(account.platform, [...existing, account])
      }
    }
    return grouped
  }, [accounts, contentType])

  // Get platforms that have logged-in accounts
  const platformsWithAccounts = useMemo(() => {
    return Array.from(accountsByPlatform.keys()).filter((platform) => {
      const platformAccounts = accountsByPlatform.get(platform) || []
      return platformAccounts.some((acc) => acc.isLoggedIn)
    })
  }, [accountsByPlatform])

  // Get platforms that support this content type but don't have saved accounts
  const otherAvailablePlatforms = useMemo(() => {
    const allPlatforms = Object.keys(PLATFORMS) as PlatformType[]
    return allPlatforms.filter((platform) => {
      const platformInfo = PLATFORMS[platform]
      if (!platformInfo?.supportedContentTypes.includes(contentType)) return false
      // Exclude platforms that already have logged-in accounts
      return !platformsWithAccounts.includes(platform)
    })
  }, [contentType, platformsWithAccounts])

  // Group other platforms by category for display
  const otherPlatformsByCategory = useMemo(() => {
    return PLATFORM_CATEGORIES.map((category) => ({
      ...category,
      platforms: category.platforms.filter((p) => otherAvailablePlatforms.includes(p))
    })).filter((category) => category.platforms.length > 0)
  }, [otherAvailablePlatforms])

  if (loading) {
    return (
      <div className="mb-5">
        <label className="block text-sm font-medium mb-3">选择发布账号</label>
        <div className="p-4 text-center text-muted-foreground text-sm">加载中...</div>
      </div>
    )
  }

  const totalSelected = selectedAccountIds.size + selectedOtherPlatforms.size

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-medium">
          选择发布账号
          {totalSelected > 0 && (
            <span className="ml-2 text-muted-foreground font-normal">
              已选 {totalSelected} 个账号
            </span>
          )}
        </label>
      </div>

      {/* Saved accounts section - now using checkboxes for multi-select */}
      {platformsWithAccounts.length > 0 ? (
        <div className="space-y-4">
          {platformsWithAccounts.map((platform) => {
            const platformInfo = PLATFORMS[platform]
            const platformAccounts = (accountsByPlatform.get(platform) || []).filter(
              (acc) => acc.isLoggedIn
            )

            return (
              <div key={platform} className="p-3 rounded-lg border bg-background">
                <div className="flex items-center gap-2 mb-2">
                  <PlatformIcon platform={platform} size={18} />
                  <span className="text-sm font-medium">{platformInfo?.name || platform}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {platformAccounts.map((account) => {
                    const isSelected = selectedAccountIds.has(account.id)
                    return (
                      <label
                        key={account.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'bg-background hover:border-foreground/30'
                        } ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <Checkbox
                          isSelected={isSelected}
                          onValueChange={() => onAccountToggle(account.id)}
                          isDisabled={isDisabled}
                          size="sm"
                        />
                        <Avatar src={account.avatar} size="sm" name={account.username} />
                        <span className="text-sm">{account.displayName || account.username}</span>
                        {account.isDefault && (
                          <Chip size="sm" variant="flat" color="warning">
                            默认
                          </Chip>
                        )}
                      </label>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="p-4 text-center text-muted-foreground text-sm bg-muted rounded-lg border border-dashed flex flex-col items-center gap-2 mb-3">
          <AlertCircle className="size-5" />
          <span>暂无已登录的账号</span>
          <span className="text-xs">请先在"账号管理"中添加账号，或使用下方"其他平台"</span>
        </div>
      )}

      {/* Other platforms section */}
      {onOtherPlatformToggle && otherAvailablePlatforms.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowOtherPlatforms(!showOtherPlatforms)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            disabled={isDisabled}
          >
            {showOtherPlatforms ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
            <span>其他平台</span>
            {selectedOtherPlatforms.size > 0 && (
              <Chip size="sm" variant="flat">
                已选 {selectedOtherPlatforms.size}
              </Chip>
            )}
            <span className="text-xs">（需自行处理登录）</span>
          </button>

          {showOtherPlatforms && (
            <div className="mt-3 p-3 rounded-lg border bg-muted/30 space-y-4">
              {otherPlatformsByCategory.map((category) => (
                <div key={category.id}>
                  <div className="text-xs text-muted-foreground mb-2">{category.name}</div>
                  <div className="flex flex-wrap gap-2">
                    {category.platforms.map((platform) => {
                      const platformInfo = PLATFORMS[platform]
                      const isSelected = selectedOtherPlatforms.has(platform)
                      return (
                        <label
                          key={platform}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'bg-background hover:border-foreground/30'
                          } ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <Checkbox
                            isSelected={isSelected}
                            onValueChange={() => onOtherPlatformToggle(platform)}
                            isDisabled={isDisabled}
                            size="sm"
                          />
                          <PlatformIcon platform={platform} size={16} />
                          <span className="text-sm">{platformInfo?.name || platform}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Hook for managing account selection (supports multi-select per platform)
export function useAccountSelection(contentType: SyncContentType) {
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set())
  const [selectedOtherPlatforms, setSelectedOtherPlatforms] = useState<Set<PlatformType>>(new Set())
  const [accounts, setAccounts] = useState<Account[]>([])

  // Load accounts
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const accountList = await window.api.account.list()
        setAccounts(accountList)

        // Auto-select default accounts for each platform
        const defaults = new Set<string>()
        for (const account of accountList) {
          if (account.isDefault && account.isLoggedIn) {
            const platformInfo = PLATFORMS[account.platform]
            if (platformInfo?.supportedContentTypes.includes(contentType)) {
              defaults.add(account.id)
            }
          }
        }
        setSelectedAccountIds(defaults)
      } catch (error) {
        console.error('Failed to load accounts:', error)
      }
    }
    loadAccounts()
  }, [contentType])

  const handleAccountToggle = useCallback((accountId: string) => {
    setSelectedAccountIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(accountId)) {
        newSet.delete(accountId)
      } else {
        newSet.add(accountId)
      }
      return newSet
    })
  }, [])

  const handleOtherPlatformToggle = useCallback((platform: PlatformType) => {
    setSelectedOtherPlatforms((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(platform)) {
        newSet.delete(platform)
      } else {
        newSet.add(platform)
      }
      return newSet
    })
  }, [])

  // Get selected platforms (platforms with selected accounts + other platforms)
  const selectedPlatforms = useMemo(() => {
    const platforms = new Set<PlatformType>()
    for (const accountId of selectedAccountIds) {
      const account = accounts.find((acc) => acc.id === accountId)
      if (account) {
        platforms.add(account.platform)
      }
    }
    for (const platform of selectedOtherPlatforms) {
      platforms.add(platform)
    }
    return platforms
  }, [selectedAccountIds, selectedOtherPlatforms, accounts])

  // Get account info by id
  const getAccount = useCallback(
    (accountId: string) => {
      return accounts.find((acc) => acc.id === accountId)
    },
    [accounts]
  )

  return {
    selectedAccountIds,
    selectedOtherPlatforms,
    selectedPlatforms,
    accounts,
    handleAccountToggle,
    handleOtherPlatformToggle,
    getAccount
  }
}

// Platform selector component
interface PlatformSelectorProps {
  contentType: SyncContentType
  selectedPlatforms: Set<PlatformType>
  onPlatformToggle: (platform: PlatformType) => void
  onSelectAll: () => void
  onClearAll: () => void
  isDisabled?: boolean
}

export function PlatformSelector({
  contentType,
  selectedPlatforms,
  onPlatformToggle,
  onSelectAll,
  onClearAll,
  isDisabled = false
}: PlatformSelectorProps): React.ReactElement {
  const supportedPlatforms = Object.keys(PLATFORMS) as PlatformType[]

  const availablePlatforms = useMemo(() => {
    return supportedPlatforms.filter((platform) => {
      const platformInfo = PLATFORMS[platform]
      return platformInfo?.supportedContentTypes.includes(contentType)
    })
  }, [contentType, supportedPlatforms])

  const categorizedPlatforms = useMemo(() => {
    return PLATFORM_CATEGORIES.map((category) => ({
      ...category,
      platforms: category.platforms.filter((platform) => availablePlatforms.includes(platform))
    })).filter((category) => category.platforms.length > 0)
  }, [availablePlatforms])

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-medium">
          发布到
          {selectedPlatforms.size > 0 && (
            <span className="ml-2 text-muted-foreground font-normal">
              已选 {selectedPlatforms.size} 个平台
            </span>
          )}
        </label>
        {availablePlatforms.length > 0 && (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onPress={onSelectAll}
              isDisabled={isDisabled || selectedPlatforms.size === availablePlatforms.length}
            >
              全选
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onPress={onClearAll}
              isDisabled={isDisabled || selectedPlatforms.size === 0}
            >
              清空
            </Button>
          </div>
        )}
      </div>
      {availablePlatforms.length === 0 ? (
        <div className="p-4 text-center text-muted-foreground text-sm bg-muted rounded-lg border border-dashed">
          当前内容类型没有可用的平台
        </div>
      ) : (
        <div className="space-y-4">
          {categorizedPlatforms.map((category) => (
            <div key={category.id}>
              <div className="text-xs text-muted-foreground mb-2">{category.name}</div>
              <div className="flex flex-wrap gap-2">
                {category.platforms.map((platform) => {
                  const platformInfo = PLATFORMS[platform]
                  const isSelected = selectedPlatforms.has(platform)
                  return (
                    <label
                      key={platform}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'bg-background hover:border-foreground/30'
                      } ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <Checkbox
                        isSelected={isSelected}
                        onValueChange={() => onPlatformToggle(platform)}
                        isDisabled={isDisabled}
                        size="sm"
                      />
                      <span className="text-sm">{platformInfo?.name || platform}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Auto submit toggle component
interface AutoSubmitToggleProps {
  isSelected: boolean
  onValueChange: (value: boolean) => void
  isDisabled?: boolean
}

export function AutoSubmitToggle({
  isSelected,
  onValueChange,
  isDisabled = false
}: AutoSubmitToggleProps): React.ReactElement {
  return (
    <div className="mb-5">
      <Checkbox
        isSelected={isSelected}
        onValueChange={onValueChange}
        isDisabled={isDisabled}
        size="sm"
      >
        <span className="text-sm">自动发布</span>
        <span className="text-xs text-muted-foreground ml-1">
          （填充内容后自动点击发送按钮）
        </span>
      </Checkbox>
    </div>
  )
}

// Publish progress card component - now supports account-based states
interface PublishProgressCardProps {
  publishStates: AccountPublishState[]
  isPublishing: boolean
  onViewAccount?: (accountId: string) => void
  onCancelPublish?: () => void
  onRetryAccount?: (accountId: string) => void
  onCancelAccount?: (accountId: string) => void
}

export function PublishProgressCard({
  publishStates,
  isPublishing,
  onViewAccount,
  onCancelPublish,
  onRetryAccount,
  onCancelAccount
}: PublishProgressCardProps): React.ReactElement | null {
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    if (!isPublishing && publishStates.length > 0) {
      const allDone = publishStates.every(
        (s) => s.status === 'completed' || s.status === 'failed' || s.status === 'cancelled'
      )
      if (allDone) {
        const timer = setTimeout(() => setIsCollapsed(true), 2000)
        return () => clearTimeout(timer)
      }
    }
    if (isPublishing) {
      setIsCollapsed(false)
    }
  }, [isPublishing, publishStates])

  const progressSummary = useMemo(() => {
    const completed = publishStates.filter((s) => s.status === 'completed').length
    const failed = publishStates.filter((s) => s.status === 'failed').length
    return { completed, failed, total: publishStates.length }
  }, [publishStates])

  if (publishStates.length === 0) return null

  return (
    <Card className="p-6 shadow-none border">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold">发布进度</h3>
          {isCollapsed ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="size-4 text-muted-foreground" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {progressSummary.completed}/{progressSummary.total} 成功
            {progressSummary.failed > 0 && (
              <span className="text-danger ml-1">, {progressSummary.failed} 失败</span>
            )}
          </span>
          {isPublishing && onCancelPublish && (
            // Wrapper stops the DOM click from bubbling to the collapsible header's
            // toggle (PressEvent has no stopPropagation); Button keeps onPress for cancel.
            <span className="inline-flex" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="flat"
                color="danger"
                size="sm"
                onPress={() => onCancelPublish()}
                startContent={<StopCircle className="size-4" />}
              >
                取消
              </Button>
            </span>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <ul className="space-y-0 mt-4">
          {publishStates.map((state) => {
            const platformInfo = PLATFORMS[state.platform]
            // Display: platform name + account display name (if multiple accounts)
            const displayLabel = state.displayName
              ? `${platformInfo?.name || state.platform} (${state.displayName})`
              : platformInfo?.name || state.platform
            return (
              <li
                key={state.accountId}
                className="flex items-center gap-3 py-3 border-b last:border-b-0"
              >
                <span className="flex-shrink-0">{getStatusIcon(state.status)}</span>
                <PlatformIcon platform={state.platform} size={16} />
                <span className="font-medium min-w-[80px]">{displayLabel}</span>
                <span className="text-sm text-muted-foreground flex-1">
                  {state.message || getDefaultMessage(state.status)}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {onCancelAccount && state.status === 'pending' && isPublishing && (
                    <Button
                      variant="flat"
                      color="danger"
                      size="sm"
                      onPress={() => onCancelAccount(state.accountId)}
                    >
                      取消
                    </Button>
                  )}
                  {onRetryAccount && state.status === 'failed' && (
                    <Button
                      variant="flat"
                      color="primary"
                      size="sm"
                      onPress={() => onRetryAccount(state.accountId)}
                    >
                      重试
                    </Button>
                  )}
                  {onViewAccount && (
                    <Button
                      variant="light"
                      size="sm"
                      isIconOnly
                      onPress={() => onViewAccount(state.accountId)}
                    >
                      <Eye className="size-4" />
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
