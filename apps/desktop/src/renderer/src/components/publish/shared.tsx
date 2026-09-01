import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Checkbox } from '../ui/checkbox'
import { Input } from '../ui/input'
import { Tooltip } from '../ui/tooltip'
import { toast } from '../ui/sonner'
import {
  CheckCircle,
  XCircle,
  Circle,
  Loader2,
  Eye,
  StopCircle,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Plus,
  Image as ImageIcon,
  X
} from 'lucide-react'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import type {
  Account,
  FileData,
  PlatformType,
  PublishGroupSummary,
  PublishTargetStatus,
  SyncContentType
} from '../../../../shared/types'
import {
  getPlatformPublishTarget,
  getPlatformPublishTargetsByContentType,
  PLATFORMS
} from '../../../../shared/constants'
import { PlatformIcon } from '../PlatformIcon'
import { AccountAvatar } from '../AccountAvatar'
import { useAccounts } from '../../lib/queries'

// PlatformIcon moved to its own file so leaf components (e.g. AccountAvatar)
// can use it without importing this whole module; re-exported for callers.
export { PlatformIcon }

export type PublishStatus = 'idle' | 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

// Legacy platform-based state (deprecated, use AccountPublishState instead)
export interface PlatformPublishState {
  platform: PlatformType
  status: PublishStatus
  message?: string
}

// New account-based state for multi-account support; mirrors the publish
// group's per-target state in the main process (status + executing step).
export interface AccountPublishState {
  accountId: string
  platform: PlatformType
  displayName?: string
  status: PublishTargetStatus
  /** Live description of the executing step（等待页面加载/填充内容/提交发布）. */
  step?: string
  error?: string
  postUrl?: string
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
      'juejin',
      'cnblogs'
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
      'pinterest',
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
      'vivovideo',
      'iqiyi',
      'youku',
      'tencentvideo'
    ]
  },
  {
    id: 'article',
    name: '文章平台',
    platforms: [
      'csdn',
      'jianshu',
      'segmentfault',
      'sspai',
      '51cto',
      'wordpress',
      'aliyun',
      'tencentyun',
      'volcengine',
      'medium',
      'oschina',
      'infoq',
      'smzdm',
      'woshipm',
      'gelonghui',
      'jiankangjie',
      'kaidiwang',
      'autohome',
      'jianpian',
      'tonghuashun',
      'dongchedi',
      'dingduanhao',
      'kuaichuanhao'
    ]
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

// Chip-style tag input, mirroring the web app's HeroTagInput interaction:
// Enter or comma confirms a tag, Backspace on empty input removes the last one.
interface TagInputProps {
  value: string[]
  onChange: (value: string[]) => void
  label?: string
  placeholder?: string
  isDisabled?: boolean
}

export function TagInput({
  value,
  onChange,
  label = '标签',
  placeholder = '输入标签，回车或逗号确认',
  isDisabled = false
}: TagInputProps): React.ReactElement {
  const [inputValue, setInputValue] = useState('')

  const addTag = useCallback(() => {
    const newTag = inputValue.trim()
    if (newTag && !value.includes(newTag)) {
      onChange([...value, newTag])
    }
    setInputValue('')
  }, [inputValue, value, onChange])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault()
        addTag()
      } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
        onChange(value.slice(0, -1))
      }
    },
    [addTag, inputValue, value, onChange]
  )

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {value.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {value.map((tag) => (
            <Badge
              key={tag}
              size="sm"
              onClose={isDisabled ? undefined : () => onChange(value.filter((t) => t !== tag))}
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1">
        <Input
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isDisabled}
        />
        {inputValue.trim() && (
          <Button variant="ghost" size="icon-sm" onClick={addTag} aria-label="添加标签" title="添加标签">
            <Plus />
          </Button>
        )}
      </div>
    </div>
  )
}

/** Resolve a dropped File to FileData via its filesystem path; blob URLs
 * can't cross into platform BrowserViews, so fill scripts need local-file://. */
export async function fileDataFromDrop(file: File): Promise<FileData | null> {
  let filePath = ''
  try {
    filePath = window.api.app.getPathForFile(file)
  } catch {
    filePath = ''
  }
  if (!filePath) return null
  return fileDataFromPath(filePath)
}

export async function fileDataFromPath(filePath: string): Promise<FileData | null> {
  try {
    return await window.api.app.getFileInfo(filePath)
  } catch (error) {
    console.error('Failed to read file info:', error)
    return null
  }
}

export const COVER_FILE_FILTERS = [{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]

// Optional cover slot with click-to-pick and drag & drop
interface CoverUploadProps {
  label: string
  hint?: string
  file: FileData | null
  onSelect: (file: FileData) => void
  onRemove: () => void
  isDisabled: boolean
}

export function CoverUpload({
  label,
  hint,
  file,
  onSelect,
  onRemove,
  isDisabled
}: CoverUploadProps): React.ReactElement {
  const [isDragging, setIsDragging] = useState(false)

  const handlePick = useCallback(async () => {
    if (isDisabled) return
    const [filePath] = await window.api.app.selectFile({ filters: COVER_FILE_FILTERS })
    if (!filePath) return
    const fileData = await fileDataFromPath(filePath)
    if (fileData) onSelect(fileData)
  }, [isDisabled, onSelect])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (isDisabled) return
      const dropped = e.dataTransfer.files[0]
      if (!dropped) return
      const fileData = await fileDataFromDrop(dropped)
      if (fileData) onSelect(fileData)
    },
    [isDisabled, onSelect]
  )

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
        {hint && <span className="ml-1 font-normal">{hint}</span>}
      </label>
      {!file ? (
        <div
          onClick={handlePick}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={(e) => {
            e.preventDefault()
            setIsDragging(false)
          }}
          className={`flex items-center justify-center gap-2 rounded-xl border border-dashed border-border p-4 cursor-pointer transition-colors ${
            isDragging ? 'bg-foreground/[0.05]' : 'bg-foreground/[0.02] hover:bg-foreground/[0.05]'
          } ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <ImageIcon className="size-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">点击或拖拽图片到此处</span>
        </div>
      ) : (
        <div className="relative inline-block self-start">
          <img
            src={file.url}
            alt={label}
            className="h-24 w-auto rounded-lg object-cover ring-1 ring-foreground/5"
          />
          <Button
            variant="secondary"
            size="icon-sm"
            onClick={onRemove}
            disabled={isDisabled}
            aria-label={`移除${label}`}
            className="absolute -top-2 -right-2 size-6 rounded-full shadow-sm [&_svg]:size-3"
          >
            <X />
          </Button>
        </div>
      )}
    </div>
  )
}

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
      return <Circle className="size-4 text-muted-foreground" />
    case 'processing':
      return <Loader2 className="size-4 text-foreground animate-spin" />
    case 'completed':
      return <CheckCircle className="size-4 text-foreground" />
    case 'failed':
      return <XCircle className="size-4 text-destructive" />
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
      return '发布失败，可重试'
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
  const [showOtherPlatforms, setShowOtherPlatforms] = useState(false)
  const accountsQuery = useAccounts()
  const accounts = accountsQuery.data ?? []

  useEffect(() => {
    if (accountsQuery.error) {
      console.error('Failed to load accounts:', accountsQuery.error)
      toast.error('账号列表没加载出来', { description: '刷新页面或重启应用试试。' })
    }
  }, [accountsQuery.error])

  // Group accounts by platform and filter by content type support
  const accountsByPlatform = useMemo(() => {
    const grouped = new Map<PlatformType, Account[]>()
    for (const account of accounts) {
      if (getPlatformPublishTarget(account.platform, contentType)) {
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
    return getPlatformPublishTargetsByContentType(contentType)
      .map((target) => target.platform)
      .filter((platform) => !platformsWithAccounts.includes(platform))
  }, [contentType, platformsWithAccounts])

  // Group other platforms by category for display
  const otherPlatformsByCategory = useMemo(() => {
    return PLATFORM_CATEGORIES.map((category) => ({
      ...category,
      platforms: category.platforms.filter((p) => otherAvailablePlatforms.includes(p))
    })).filter((category) => category.platforms.length > 0)
  }, [otherAvailablePlatforms])

  if (accountsQuery.isPending) {
    return (
      <div className="flex flex-col gap-3">
        <label className="text-xs font-medium text-muted-foreground">选择发布账号</label>
        <div className="p-4 text-center text-muted-foreground text-sm">加载中...</div>
      </div>
    )
  }

  const totalSelected = selectedAccountIds.size + selectedOtherPlatforms.size

  return (
    <div className="flex flex-col gap-3">
      <label className="text-xs font-medium text-muted-foreground">
        选择发布账号
        {totalSelected > 0 && <span className="ml-2 font-normal">已选 {totalSelected} 个账号</span>}
      </label>

      {/* Saved accounts section - now using checkboxes for multi-select */}
      {platformsWithAccounts.length > 0 ? (
        <div className="flex flex-col gap-4">
          {platformsWithAccounts.map((platform) => {
            const platformInfo = PLATFORMS[platform]
            const platformAccounts = (accountsByPlatform.get(platform) || []).filter(
              (acc) => acc.isLoggedIn
            )

            return (
              <div key={platform} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <PlatformIcon platform={platform} size={16} />
                  <span className="text-xs font-medium text-muted-foreground">
                    {getPlatformPublishTarget(platform, contentType)?.name || platformInfo?.name || platform}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {platformAccounts.map((account) => {
                    const isSelected = selectedAccountIds.has(account.id)
                    return (
                      <div
                        key={account.id}
                        onClick={() => !isDisabled && onAccountToggle(account.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-foreground/[0.08]'
                            : 'bg-foreground/[0.03] hover:bg-foreground/[0.06]'
                        } ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => onAccountToggle(account.id)}
                          onClick={(e) => e.stopPropagation()}
                          disabled={isDisabled}
                          aria-label={`选择账号 ${account.displayName || account.username}`}
                        />
                        <AccountAvatar
                          avatar={account.avatar}
                          platform={account.platform}
                          size={30}
                        />
                        <span className="text-sm">{account.displayName || account.username}</span>
                        {account.isDefault && <Badge size="sm">默认</Badge>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="p-4 text-center text-muted-foreground text-sm bg-foreground/[0.03] rounded-xl flex flex-col items-center gap-2">
          <AlertCircle className="size-5" />
          <span>暂无已登录的账号</span>
          <span className="text-xs">请先在"账号管理"中添加账号，或使用下方"其他平台"</span>
        </div>
      )}

      {/* Other platforms section */}
      {onOtherPlatformToggle && otherAvailablePlatforms.length > 0 && (
        <div className="flex flex-col gap-3">
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
              <Badge size="sm">已选 {selectedOtherPlatforms.size}</Badge>
            )}
            <span className="text-xs">（需自行处理登录）</span>
          </button>

          {showOtherPlatforms && (
            <div className="flex flex-col gap-4 p-3 rounded-xl bg-foreground/[0.03]">
              {otherPlatformsByCategory.map((category) => (
                <div key={category.id} className="flex flex-col gap-2">
                  <div className="text-xs text-muted-foreground">{category.name}</div>
                  <div className="flex flex-wrap gap-2">
                    {category.platforms.map((platform) => {
                      const platformInfo = PLATFORMS[platform]
                      const isSelected = selectedOtherPlatforms.has(platform)
                      return (
                        <div
                          key={platform}
                          onClick={() => !isDisabled && onOtherPlatformToggle(platform)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-card'
                              : 'bg-background hover:bg-foreground/[0.06]'
                          } ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => onOtherPlatformToggle(platform)}
                            onClick={(e) => e.stopPropagation()}
                            disabled={isDisabled}
                            aria-label={`选择平台 ${platformInfo?.name || platform}`}
                          />
                          <PlatformIcon platform={platform} size={16} />
                          <span className="text-sm">
                            {getPlatformPublishTarget(platform, contentType)?.name ||
                              platformInfo?.name ||
                              platform}
                          </span>
                        </div>
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
/**
 * Two-step publish flow shared by all publish pages: compose first (immersive
 * editing), then configure (publish metadata + accounts on the left, content
 * preview on the right).
 */
export type PublishStep = 'compose' | 'configure'

export interface InitialAccountSelection {
  accountIds?: string[]
  otherPlatforms?: PlatformType[]
}

export function useAccountSelection(
  contentType: SyncContentType,
  /** Cached selection to restore instead of the per-platform defaults; read once on mount. */
  initialSelection?: InitialAccountSelection
) {
  // Locked at mount so an unstable object literal from the caller can't
  // re-trigger the account-loading effect (and wipe the user's selection).
  const initialSelectionRef = useRef(initialSelection)
  const initializedContentTypeRef = useRef<SyncContentType | null>(null)
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set())
  const [selectedOtherPlatforms, setSelectedOtherPlatforms] = useState<Set<PlatformType>>(
    () => new Set(initialSelectionRef.current?.otherPlatforms || [])
  )
  const accountsQuery = useAccounts()
  const accounts = accountsQuery.data ?? []

  useEffect(() => {
    if (accountsQuery.error) {
      console.error('Failed to load accounts:', accountsQuery.error)
      toast.error('账号列表没加载出来', { description: '刷新页面或重启应用试试。' })
    }
  }, [accountsQuery.error])

  useEffect(() => {
    if (
      !accountsQuery.isSuccess ||
      accountsQuery.isFetching ||
      initializedContentTypeRef.current === contentType
    ) {
      return
    }
    initializedContentTypeRef.current = contentType

    // A restored selection wins over defaults, filtered to accounts that
    // still exist and can publish this content type.
    const cachedIds = initialSelectionRef.current?.accountIds
    if (cachedIds && cachedIds.length > 0) {
      const restorable = new Set<string>()
      for (const account of accounts) {
        if (
          cachedIds.includes(account.id) &&
          getPlatformPublishTarget(account.platform, contentType)
        ) {
          restorable.add(account.id)
        }
      }
      if (restorable.size > 0) {
        setSelectedAccountIds(restorable)
        return
      }
    }

    // Auto-select default accounts for each platform.
    const defaults = new Set<string>()
    for (const account of accounts) {
      if (
        account.isDefault &&
        account.isLoggedIn &&
        getPlatformPublishTarget(account.platform, contentType)
      ) {
        defaults.add(account.id)
      }
    }
    setSelectedAccountIds(defaults)
  }, [accounts, accountsQuery.isFetching, accountsQuery.isSuccess, contentType])

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
  const availablePlatforms = useMemo(() => {
    return getPlatformPublishTargetsByContentType(contentType).map((target) => target.platform)
  }, [contentType])

  const categorizedPlatforms = useMemo(() => {
    return PLATFORM_CATEGORIES.map((category) => ({
      ...category,
      platforms: category.platforms.filter((platform) => availablePlatforms.includes(platform))
    })).filter((category) => category.platforms.length > 0)
  }, [availablePlatforms])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">
          发布到
          {selectedPlatforms.size > 0 && (
            <span className="ml-2 font-normal">已选 {selectedPlatforms.size} 个平台</span>
          )}
        </label>
        {availablePlatforms.length > 0 && (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSelectAll}
              disabled={isDisabled || selectedPlatforms.size === availablePlatforms.length}
            >
              全选
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              disabled={isDisabled || selectedPlatforms.size === 0}
            >
              清空
            </Button>
          </div>
        )}
      </div>
      {availablePlatforms.length === 0 ? (
        <div className="p-4 text-center text-muted-foreground text-sm bg-foreground/[0.03] rounded-xl">
          当前内容类型没有可用的平台
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {categorizedPlatforms.map((category) => (
            <div key={category.id} className="flex flex-col gap-2">
              <div className="text-xs text-muted-foreground">{category.name}</div>
              <div className="flex flex-wrap gap-2">
                {category.platforms.map((platform) => {
                  const isSelected = selectedPlatforms.has(platform)
                  return (
                    <div
                      key={platform}
                      onClick={() => !isDisabled && onPlatformToggle(platform)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-foreground/[0.08]'
                          : 'bg-foreground/[0.03] hover:bg-foreground/[0.06]'
                      } ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onPlatformToggle(platform)}
                        onClick={(e) => e.stopPropagation()}
                        disabled={isDisabled}
                        aria-label={`选择平台 ${PLATFORMS[platform]?.name || platform}`}
                      />
                      <PlatformIcon platform={platform} size={16} />
                      <span className="text-sm">
                        {getPlatformPublishTarget(platform, contentType)?.name ||
                          PLATFORMS[platform]?.name ||
                          platform}
                      </span>
                    </div>
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

// Publish-verb selector: replaces the old "自动发布" checkbox with two
// mutually exclusive modes. State still maps onto the persisted autoSubmit
// boolean (true = 发布, false = 填充后我自己确认).
interface PublishModeSelectorProps {
  autoSubmit: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}

const PUBLISH_MODES: Array<{ value: boolean; label: string; hint: string }> = [
  {
    value: true,
    label: '发布',
    hint: '内容填进各平台后直接替你发出去，全程不用守着。'
  },
  {
    value: false,
    label: '填充后我自己确认',
    hint: '只把内容填进各平台，不会替你发出；逐个检查满意后，回到这里点「全部发布」。'
  }
]

export function PublishModeSelector({
  autoSubmit,
  onChange,
  disabled = false
}: PublishModeSelectorProps): React.ReactElement {
  const activeMode = PUBLISH_MODES.find((mode) => mode.value === autoSubmit) ?? PUBLISH_MODES[1]
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-muted-foreground">发布方式</label>
      <div role="radiogroup" aria-label="发布方式" className="flex rounded-xl bg-muted p-1">
        {PUBLISH_MODES.map((mode) => {
          const isActive = mode.value === autoSubmit
          return (
            <button
              key={mode.label}
              type="button"
              role="radio"
              aria-checked={isActive}
              disabled={disabled}
              onClick={() => onChange(mode.value)}
              className={`flex-1 rounded-lg px-3 py-1.5 text-sm transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
                isActive
                  ? 'bg-card font-medium text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {mode.label}
            </button>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground">{activeMode.hint}</p>
    </div>
  )
}

// Publish progress card component - now supports account-based states
interface PublishProgressCardProps {
  publishStates: AccountPublishState[]
  isPublishing: boolean
  summary?: PublishGroupSummary | null
  onViewAccount?: (accountId: string) => void
  onCancelPublish?: () => void
  onRetryAccount?: (accountId: string) => void
  onCancelAccount?: (accountId: string) => void
  /** Submits every filled-and-waiting target（手动确认模式的「全部发布」入口）. */
  onSubmitAll?: () => void
  /** Clears the form + progress so the user can start the next piece of content. */
  onStartNew?: () => void
}

function isTerminalTarget(status: PublishTargetStatus): boolean {
  return status === 'success' || status === 'failed' || status === 'cancelled'
}

function getTargetStatusIcon(status: PublishTargetStatus): React.ReactNode {
  switch (status) {
    case 'pending':
      return <Circle className="size-4 text-muted-foreground" />
    case 'filling':
      return <Loader2 className="size-4 text-foreground animate-spin" />
    case 'ready':
      return <CheckCircle className="size-4 text-muted-foreground" />
    case 'success':
      return <CheckCircle className="size-4 text-foreground" />
    case 'failed':
      return <XCircle className="size-4 text-destructive" />
    case 'cancelled':
      return <StopCircle className="size-4 text-muted-foreground" />
    default:
      return null
  }
}

function getTargetStatusText(state: AccountPublishState): string {
  switch (state.status) {
    case 'pending':
      return state.step || '等待执行'
    case 'filling':
      return state.step || '填充内容…'
    case 'ready':
      return state.step || '已填充，等待发布'
    case 'success':
      return '发布成功'
    case 'failed':
      return (
        state.error ||
        `${PLATFORMS[state.platform]?.name || state.platform}发布失败，可点击右侧重试`
      )
    case 'cancelled':
      return '已跳过'
    default:
      return ''
  }
}

export function PublishProgressCard({
  publishStates,
  isPublishing,
  summary,
  onViewAccount,
  onCancelPublish,
  onRetryAccount,
  onCancelAccount,
  onSubmitAll,
  onStartNew
}: PublishProgressCardProps): React.ReactElement | null {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const hasAutoScrolledRef = useRef(false)

  // 小窗口下点发布后进度卡常在视口外；每轮发布开始时滚过去一次，之后不再打扰。
  useEffect(() => {
    if (publishStates.length === 0) {
      hasAutoScrolledRef.current = false
      return
    }
    if (!hasAutoScrolledRef.current) {
      hasAutoScrolledRef.current = true
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [publishStates.length])

  const allDone = useMemo(
    () => publishStates.length > 0 && publishStates.every((s) => isTerminalTarget(s.status)),
    [publishStates]
  )

  useEffect(() => {
    if (!allDone) {
      setIsCollapsed(false)
    }
  }, [allDone])

  const progressSummary = useMemo(() => {
    const success = publishStates.filter((s) => s.status === 'success').length
    const failed = publishStates.filter((s) => s.status === 'failed').length
    const cancelled = publishStates.filter((s) => s.status === 'cancelled').length
    return { success, failed, cancelled, total: publishStates.length }
  }, [publishStates])

  const readyCount = useMemo(
    () => publishStates.filter((s) => s.status === 'ready').length,
    [publishStates]
  )

  const allSucceeded = allDone && progressSummary.success === progressSummary.total

  const successUrls = useMemo(
    () =>
      publishStates
        .filter((s) => s.status === 'success' && s.postUrl)
        .map((s) => s.postUrl as string),
    [publishStates]
  )

  if (publishStates.length === 0) return null

  return (
    <Card ref={cardRef} className="flex flex-col gap-4 p-6">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold">{allDone ? '发布结果' : '发布进度'}</h3>
          {isCollapsed ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="size-4 text-muted-foreground" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {progressSummary.success}/{progressSummary.total} 成功
            {progressSummary.failed > 0 && (
              <span className="text-destructive ml-1">, {progressSummary.failed} 失败</span>
            )}
            {progressSummary.cancelled > 0 && (
              <span className="ml-1">, {progressSummary.cancelled} 跳过</span>
            )}
          </span>
          {isPublishing && onCancelPublish && (
            <Button
              variant="destructive-ghost"
              size="sm"
              onClick={(e) => {
                // Keep the click from also toggling the collapsible header.
                e.stopPropagation()
                onCancelPublish()
              }}
            >
              <StopCircle />
              取消
            </Button>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <ul className="flex flex-col divide-y divide-border/60">
          {publishStates.map((state) => {
            const platformInfo = PLATFORMS[state.platform]
            // Display: platform name + account display name (if multiple accounts)
            const displayLabel = state.displayName
              ? `${platformInfo?.name || state.platform} (${state.displayName})`
              : platformInfo?.name || state.platform
            const statusText = getTargetStatusText(state)
            return (
              <li
                key={state.accountId}
                className="flex items-center gap-3 py-3 transition-colors hover:bg-foreground/[0.03]"
              >
                <span className="flex-shrink-0">{getTargetStatusIcon(state.status)}</span>
                <PlatformIcon platform={state.platform} size={16} />
                <span className="min-w-[80px] max-w-[40%] truncate font-medium" title={displayLabel}>
                  {displayLabel}
                </span>
                <span
                  className={`flex-1 truncate text-sm ${
                    state.status === 'failed' ? 'text-destructive' : 'text-muted-foreground'
                  }`}
                  title={statusText}
                >
                  {statusText}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {state.status === 'success' && state.postUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(state.postUrl, '_blank')}
                    >
                      查看链接
                    </Button>
                  )}
                  {onCancelAccount && !isTerminalTarget(state.status) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onCancelAccount(state.accountId)}
                    >
                      跳过
                    </Button>
                  )}
                  {onRetryAccount && (state.status === 'failed' || state.status === 'cancelled') && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onRetryAccount(state.accountId)}
                    >
                      重试
                    </Button>
                  )}
                  {onViewAccount && (
                    <Tooltip content="查看该账号的发布页面">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onViewAccount(state.accountId)}
                        aria-label="查看该账号的发布页面"
                      >
                        <Eye />
                      </Button>
                    </Tooltip>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* 手动确认模式：内容已填好等待提交时，把「全部发布」入口放进卡片本身 */}
      {!isCollapsed && readyCount > 0 && onSubmitAll && (
        <div className="flex flex-col gap-2">
          <Button onClick={onSubmitAll}>全部发布</Button>
          <p className="text-xs text-muted-foreground">
            会把已填充好的 {readyCount} 个账号依次发出；也可以先点上方的眼睛图标逐个检查。
          </p>
        </div>
      )}

      {/* 全部成功的收尾：给一句确定的话和下一步动作 */}
      {!isCollapsed && allSucceeded && (
        <div className="flex flex-col gap-3 rounded-xl bg-foreground/[0.03] p-4">
          <span className="text-sm font-medium text-foreground">都发出去了，去忙别的吧。</span>
          <div className="flex flex-wrap gap-2">
            {onStartNew && <Button onClick={onStartNew}>清空并开始新内容</Button>}
            {successUrls.length > 0 && (
              <Button
                variant="outline"
                onClick={() => successUrls.forEach((url) => window.open(url, '_blank'))}
              >
                查看链接
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 发布总结：未全数成功时给一份"实际发生了什么"的报告 */}
      {summary && !isCollapsed && !allSucceeded && (
        <div className="flex flex-col gap-2 rounded-xl bg-foreground/[0.03] p-4">
          <span className="text-sm font-medium">本次发布总结</span>
          <p className="text-sm text-muted-foreground">
            共 {summary.targets.length} 个账号：成功{' '}
            {summary.targets.filter((t) => t.status === 'success').length} · 失败{' '}
            {summary.targets.filter((t) => t.status === 'failed').length} · 跳过{' '}
            {summary.targets.filter((t) => t.status === 'cancelled').length}
          </p>
          {summary.targets.some((t) => t.status === 'failed') && (
            <ul className="flex flex-col gap-1">
              {summary.targets
                .filter((t) => t.status === 'failed')
                .map((t) => (
                  <li key={t.accountId} className="flex items-baseline gap-2 text-xs">
                    <span className="shrink-0 font-medium">{t.displayName}</span>
                    <span className="truncate text-destructive" title={t.error}>
                      {t.error || '未知错误'}
                    </span>
                  </li>
                ))}
            </ul>
          )}
          {summary.targets.some((t) => t.status === 'failed' || t.status === 'cancelled') && (
            <p className="text-xs text-muted-foreground">未完成的账号可在上方逐个重试。</p>
          )}
        </div>
      )}
    </Card>
  )
}
