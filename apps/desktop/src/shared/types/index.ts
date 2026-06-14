// Platform types - all platforms from MultiPost-Extension
export type PlatformType =
  // 已实现的平台
  | 'weibo'
  | 'xiaohongshu'
  | 'twitter'
  | 'douyin'
  | 'bilibili'
  | 'zhihu'
  | 'wechat'
  // 中国动态平台
  | 'xueqiu'
  | 'okjike'
  | 'kuaishou'
  | 'baijiahao'
  | 'toutiao'
  | 'toutiaohao'
  | 'weixinchannel'
  | 'v2ex'
  | 'douban'
  | 'dedao'
  | 'zsxq'
  | 'xiaoheihe'
  | 'maimai'
  | 'juejin'
  // 国际动态平台
  | 'instagram'
  | 'facebook'
  | 'linkedin'
  | 'reddit'
  | 'threads'
  | 'bluesky'
  | 'substack'
  | 'webhook'
  | 'pinterest'
  // 视频平台
  | 'youtube'
  | 'tiktok'
  | 'eastmoney'
  | 'qie'
  | 'chejiahao'
  | 'dewu'
  | 'yiche'
  | 'sohu'
  | 'netease'
  | 'dayu'
  | 'alipay'
  | 'yidian'
  | 'pinduoduo'
  | 'vivovideo'
  | 'iqiyi'
  | 'youku'
  | 'tencentvideo'
  // 文章平台
  | 'csdn'
  | 'jianshu'
  | 'segmentfault'
  | 'sspai'
  | '51cto'
  | 'wordpress'
  | 'aliyun'
  | 'tencentyun'
  | 'medium'
  | 'oschina'
  | 'infoq'
  | 'smzdm'
  | 'woshipm'
  | 'gelonghui'
  | 'jiankangjie'
  | 'kaidiwang'
  | 'autohome'
  | 'jianpian'
  | 'tonghuashun'
  | 'dongchedi'
  | 'dingduanhao'
  | 'kuaichuanhao'
  // 播客平台
  | 'qqmusic'
  | 'lizhi'
  | 'ximalaya'
  | 'xiaoyuzhou'
  | 'qingting'
  | 'neteasepodcast'
  | 'spotify'

export const ACCOUNT_ANALYTICS_PLATFORMS = [
  'bilibili',
  'zhihu',
  'weibo',
  'weixinchannel'
] as const satisfies readonly PlatformType[]

export type AccountAnalyticsPlatform = (typeof ACCOUNT_ANALYTICS_PLATFORMS)[number]

const ACCOUNT_ANALYTICS_PLATFORM_SET: ReadonlySet<PlatformType> = new Set(
  ACCOUNT_ANALYTICS_PLATFORMS
)

export function isAnalyticsSupported(platform: PlatformType): platform is AccountAnalyticsPlatform {
  return ACCOUNT_ANALYTICS_PLATFORM_SET.has(platform)
}

export interface PlatformInfo {
  id: PlatformType
  name: string
  icon: string
  iconifyIcon?: string // Iconify icon identifier, e.g. 'simple-icons:bilibili'
  faviconUrl?: string // Platform favicon URL as fallback
  accountKey?: string // Matching browser extension accountKey when desktop id differs
  url: string
  loginUrl: string
  supportedContentTypes: SyncContentType[]
}

// Content types - matching browser extension
export type SyncContentType = 'DYNAMIC' | 'VIDEO' | 'ARTICLE' | 'PODCAST'

export type PlatformPublishTargetId = `${PlatformType}:${SyncContentType}`

export interface PlatformPublishTarget {
  id: PlatformPublishTargetId
  platform: PlatformType
  accountKey: string
  contentType: SyncContentType
  name: string
  url: string
  extensionKey?: string
}

// Legacy content type for backwards compatibility
export type ContentType = 'text' | 'image' | 'video' | 'article'

// File data structure - matching browser extension
export interface FileData {
  name: string
  path?: string // 本地文件路径
  url: string // local-file:// URL 或 blob URL
  type?: string // MIME type (e.g., "image/png", "video/mp4")
  size?: number // file size in bytes
}

export function createLocalFileUrl(filePath: string): string {
  const normalizedPath = filePath.replace(/\\/g, '/')
  const pathWithoutLeadingSlash = normalizedPath.startsWith('/')
    ? normalizedPath.slice(1)
    : normalizedPath
  const encodedPath = pathWithoutLeadingSlash.split('/').map(encodeURIComponent).join('/')
  return `local-file://${encodedPath}`
}

// 从本地文件路径创建 FileData
export function createFileDataFromPath(
  filePath: string,
  fileName: string,
  mimeType?: string,
  size?: number
): FileData {
  return {
    name: fileName,
    path: filePath,
    url: createLocalFileUrl(filePath),
    type: mimeType,
    size
  }
}

// Dynamic content (social media posts)
export interface DynamicData {
  title: string
  content: string
  images: FileData[]
  videos: FileData[]
  tags?: string[]
  scheduledPublishTime?: number
}

// Video content
export interface VideoData {
  title: string
  content: string // description
  video: FileData
  tags?: string[]
  cover?: FileData
  horizontalCover?: FileData
  verticalCover?: FileData
  scheduledPublishTime?: number // timestamp in milliseconds
  category?: string | number
  original?: boolean
  collectionId?: string | number
  description?: string
}

// Article/Blog content
export interface ArticleData {
  title: string
  digest: string // summary/excerpt
  cover: FileData
  htmlContent: string
  markdownContent: string
  images?: FileData[] // optional embedded images
  horizontalCover?: FileData
  verticalCover?: FileData
  tags?: string[]
  category?: string | number
  original?: boolean
  allowComment?: boolean
  scheduledPublishTime?: number
}

// Podcast/Audio content
export interface PodcastData {
  title: string
  description: string
  audio: FileData
  cover?: FileData
  tags?: string[]
  category?: string | number
}

// Union type for all content types
export type SyncContentData = DynamicData | VideoData | ArticleData | PodcastData

// Sync data structure - matching browser extension
export interface SyncData {
  platforms: SyncDataPlatform[]
  contentType: SyncContentType
  isAutoPublish: boolean
  data: SyncContentData
  origin?: SyncContentData
}

export interface SyncDataPlatform {
  name: string
  injectUrl?: string
  extraConfig?: unknown
}

// Legacy PostContent for backwards compatibility
export interface PostContent {
  text: string
  images?: string[] // file paths or URLs
  video?: string
  title?: string // for articles
  tags?: string[]
}

// Account types
export type ProxyProtocol = 'http' | 'https' | 'socks5'

export interface ProxyConfig {
  protocol: 'http' | 'https' | 'socks5'
  host: string
  port: number
  username?: string
  password?: string
  /** safeStorage-encrypted password blob (base64), main-process only */
  encryptedPassword?: string
  /** Read-only hint for the UI: a password exists but is never sent to renderers */
  hasPassword?: boolean
}

export interface ProxyProfile {
  id: string
  name: string
  protocol: ProxyProtocol
  host: string
  port: number
  username?: string
  hasPassword?: boolean
  usageCount?: number
  createdAt: number
  updatedAt: number
}

export interface ProxyProfileInput {
  name: string
  protocol: ProxyProtocol
  host: string
  port: number
  username?: string
  password?: string
}

export interface ProxySettings {
  defaultProxyId: string | null
  globalProxyId: string | null
}

export interface AccountStats {
  fans?: number
  following?: number
  likes?: number
  works?: number
  views?: number
  updatedAt?: number
}

export interface AccountAnalyticsPoint {
  date: string
  value: number
}

export interface AccountAnalytics {
  overview: {
    fans?: number
    following?: number
    views?: number
    likes?: number
    comments?: number
    works?: number
  }
  fansTrend: AccountAnalyticsPoint[]
  updatedAt: number
}

export interface AccountComment {
  id: string
  content: string
  author?: string
  createdAt?: number
  replyCount?: number
}

export interface AccountPost {
  id: string
  title?: string
  createdAt?: number
  commentCount?: number
}

export interface DmSession {
  id: string
  peerUsername?: string
  peerName?: string
  peerAvatar?: string
  unread?: number
  lastMessage?: string
  lastTime?: number
}

export interface DmMessage {
  id: string
  fromMe: boolean
  text?: string
  createdAt?: number
}

const ACCOUNT_HEALTH_STATES = ['active', 'logged_out', 'restricted', 'banned', 'unknown'] as const

export type AccountHealthState = (typeof ACCOUNT_HEALTH_STATES)[number]

export interface AccountHealthStatus {
  state: AccountHealthState
  reason?: string
  updatedAt?: number
}

export const ACCOUNT_STAT_METRIC_KEYS = ['fans', 'following', 'likes', 'works', 'views'] as const

type AccountStatMetricKey = (typeof ACCOUNT_STAT_METRIC_KEYS)[number]

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function toFiniteMetric(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

export function sanitizeAccountStats(input: unknown): AccountStats | undefined {
  if (!isPlainRecord(input)) return undefined

  const stats: AccountStats = {}
  const numericStats = stats as Record<AccountStatMetricKey, number | undefined>
  let hasMetric = false

  for (const key of ACCOUNT_STAT_METRIC_KEYS) {
    const value = toFiniteMetric(input[key])
    if (value !== undefined) {
      numericStats[key] = value
      hasMetric = true
    }
  }

  if (!hasMetric) return undefined

  if (typeof input.updatedAt === 'number' && Number.isFinite(input.updatedAt)) {
    stats.updatedAt = input.updatedAt
  }

  return stats
}

function isAccountHealthState(value: unknown): value is AccountHealthState {
  return (
    typeof value === 'string' &&
    ACCOUNT_HEALTH_STATES.includes(value as AccountHealthState)
  )
}

export function sanitizeAccountHealth(input: unknown): AccountHealthStatus | undefined {
  try {
    if (!isPlainRecord(input)) return undefined
    if (!isAccountHealthState(input.state)) return undefined

    const health: AccountHealthStatus = { state: input.state }
    if (input.reason !== undefined && input.reason !== null) {
      try {
        const reason = String(input.reason).trim().slice(0, 512)
        if (reason.length > 0) {
          health.reason = reason
        }
      } catch {
        // Ignore uncoercible reason values; the state itself is still useful.
      }
    }

    const updatedAt = toFiniteMetric(input.updatedAt)
    if (updatedAt !== undefined) {
      health.updatedAt = updatedAt
    }

    return health
  } catch {
    return undefined
  }
}

export function hasAccountStatMetrics(stats: AccountStats | undefined): boolean {
  return sanitizeAccountStats(stats) !== undefined
}

export function mergeAccountStats(
  existing: AccountStats | undefined,
  incoming: AccountStats | undefined
): AccountStats | undefined {
  const sanitizedIncoming = sanitizeAccountStats(incoming)
  if (!sanitizedIncoming) return existing

  const sanitizedExisting = sanitizeAccountStats(existing)
  const merged: AccountStats = sanitizedExisting ? { ...sanitizedExisting } : {}
  const numericMerged = merged as Record<AccountStatMetricKey, number | undefined>

  for (const key of ACCOUNT_STAT_METRIC_KEYS) {
    const value = sanitizedIncoming[key]
    if (typeof value === 'number' && Number.isFinite(value)) {
      numericMerged[key] = value
    }
  }

  if (typeof sanitizedIncoming.updatedAt === 'number' && Number.isFinite(sanitizedIncoming.updatedAt)) {
    merged.updatedAt = sanitizedIncoming.updatedAt
  }

  return hasAccountStatMetrics(merged) ? merged : existing
}

export interface ProxyTestResult {
  ok: boolean
  latencyMs?: number
  error?: string
}

export interface Account {
  id: string
  platform: PlatformType
  username: string
  displayName?: string
  remark?: string
  avatar?: string
  stats?: AccountStats
  health?: AccountHealthStatus
  isLoggedIn: boolean
  lastLoginAt?: number
  groupId?: string
  sessionPartition: string
  proxyId?: string | null
  proxyConfig?: ProxyConfig
  isDefault: boolean
  createdAt: number
  updatedAt: number
}

/**
 * Strip the proxy password before an account crosses to a renderer. The web
 * dashboard view loads remote web content, so the decrypted password must
 * never leave the main process; the UI only learns whether one is set.
 */
export function toPublicAccount(account: Account): Account {
  const proxy = account.proxyConfig
  if (!proxy || (!proxy.password && !proxy.encryptedPassword)) {
    return account
  }
  const { password, encryptedPassword, ...proxyRest } = proxy
  return {
    ...account,
    proxyConfig: { ...proxyRest, hasPassword: Boolean(password || encryptedPassword) }
  }
}

// Account group types
export interface AccountGroup {
  id: string
  name: string
  color?: string
  order: number
  createdAt: number
  updatedAt: number
}

// Draft types
export interface Draft {
  id: string
  title: string
  contentType: SyncContentType
  content: string
  htmlContent?: string
  images?: string[]
  videos?: string[]
  video?: string
  cover?: string
  tags?: string[]
  selectedPlatforms?: PlatformType[]
  createdAt: number
  updatedAt: number
}

// Publish history types
export type PublishHistoryStatus = 'success' | 'failed' | 'pending'

export interface PublishHistory {
  id: string
  contentType: SyncContentType
  title: string
  content: string
  platform: PlatformType
  accountId: string
  status: PublishHistoryStatus
  errorMessage?: string
  platformPostId?: string
  platformPostUrl?: string
  publishedAt: number
  createdAt: number
}

// Scheduled publish types
export type ScheduledPublishStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

export interface ScheduledPublish {
  id: string
  contentType: SyncContentType
  title: string
  content: string
  data: string // JSON stringified SyncContentData
  platforms: PlatformType[]
  accountIds: string[]
  scheduledAt: number
  status: ScheduledPublishStatus
  errorMessage?: string
  createdAt: number
  updatedAt: number
}

// Task types
export type TaskStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled'

export interface PublishTask {
  id: string
  accountId: string
  platform: PlatformType
  content: PostContent
  status: TaskStatus
  scheduledAt?: number
  executedAt?: number
  result?: PublishResult
  error?: string
  createdAt: number
  updatedAt: number
}

export interface PublishResult {
  success: boolean
  postId?: string
  postUrl?: string
  error?: string
}

export type PublishBridgeCode = 0 | number

// IPC Channel types
export interface IpcChannels {
  // Account management
  'account:list': () => Promise<Account[]>
  'account:get': (id: string) => Promise<Account | null>
  'account:create': (platform: PlatformType) => Promise<Account>
  'account:delete': (id: string) => Promise<void>
  'account:update': (id: string, data: Partial<Account>) => Promise<Account>
  'account:listPosts': (id: string) => Promise<AccountPost[]>
  'account:listComments': (id: string, exportId: string) => Promise<AccountComment[]>
  'account:replyComment': (
    id: string,
    exportId: string,
    content: string,
    replyCommentId?: string
  ) => Promise<AccountComment | null>
  'account:dmSessions': (id: string) => Promise<DmSession[]>
  'account:dmMessages': (id: string, sessionId: string) => Promise<DmMessage[]>
  'account:sendDm': (
    id: string,
    sessionId: string,
    toUsername: string,
    text: string
  ) => Promise<DmMessage | null>

  // BrowserView management
  'browser:open': (accountId: string, url?: string) => Promise<void>
  'browser:close': (accountId: string) => Promise<void>
  'browser:show': (accountId: string) => Promise<void>
  'browser:hide': (accountId: string) => Promise<void>
  'browser:navigate': (accountId: string, url: string) => Promise<void>
  'browser:execute': (accountId: string, script: string) => Promise<unknown>
  'browser:getLoginStatus': (accountId: string) => Promise<boolean>
  'browser:tabNavigate': (tabId: string, url: string) => Promise<void>

  // Publishing
  'publish:execute': (taskId: string) => Promise<PublishResult>
  'publish:cancel': (taskId: string) => Promise<void>

  // Task management
  'task:create': (task: Omit<PublishTask, 'id' | 'createdAt' | 'updatedAt'>) => Promise<PublishTask>
  'task:list': (filters?: { platform?: PlatformType; status?: TaskStatus }) => Promise<PublishTask[]>
  'task:get': (id: string) => Promise<PublishTask | null>
  'task:update': (id: string, data: Partial<PublishTask>) => Promise<PublishTask>
  'task:delete': (id: string) => Promise<void>

  // App
  'app:getVersion': () => Promise<string>
  'app:getPlatforms': () => Promise<PlatformInfo[]>
}

// Browser Tab types
export interface BrowserTab {
  id: string // accountId or groupId
  platform: PlatformType
  title: string
  url: string
  faviconUrl?: string
  isActive: boolean
  isHome: boolean // 首页 tab 不能关闭（原生渲染，无 web contents）
  isWeb?: boolean // Web 工作台 tab（懒创建、可关闭）
  canGoBack: boolean
  canGoForward: boolean
  // Group-specific fields
  isGroup?: boolean // 是否为发布 Group tab
  groupId?: string // Group ID (if isGroup is true)
}

// ========== Publish Group Types ==========

// 发布 Group 整体状态
export type PublishGroupStatus = 'preparing' | 'publishing' | 'completed' | 'failed' | 'cancelled'

// 单个发布目标状态
export type PublishTargetStatus = 'pending' | 'filling' | 'ready' | 'success' | 'failed' | 'cancelled'

// Web-facing publish status vocabulary used by apps/web/lib/desktop-bridge.ts
export type PublishStatus = 'idle' | 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

export type PublishEventStatus = Exclude<PublishStatus, 'idle'>

export interface PublishTargetResult {
  platform: PlatformType
  accountId: string
  status: PublishTargetStatus
  error?: string
  postUrl?: string
  extensionKey?: string
}

export interface PublishEventPayload {
  groupId?: string
  taskId?: string
  platform: PlatformType
  accountId: string
  contentType: SyncContentType
  status: PublishEventStatus
  error?: string
  postUrl?: string
  extensionKey?: string
}

export type PublishLifecycleStatus = PublishGroupStatus | 'idle'

export interface PublishStatusSnapshot {
  taskId: string
  groupId?: string
  contentType?: SyncContentType
  status: PublishLifecycleStatus
  targets: PublishTargetResult[]
  updatedAt: number
}

export interface PublishBridgeEnvelope<TData = unknown> {
  code: PublishBridgeCode
  message: string
  data: TData
  success: boolean
  error?: string
  results?: PublishTargetResult[]
}

// 发布 Group 内的单个 Tab
export interface GroupTab {
  id: string // accountId
  groupId: string
  platform: PlatformType
  displayName: string
  status: PublishTargetStatus
  isActive: boolean
  /** Human-readable description of the step currently executing (等待页面加载/填充内容/提交中). */
  step?: string
  error?: string
  postUrl?: string
}

// 发布 Group 结束后的总结（每个目标的最终结果）
export interface PublishGroupSummary {
  groupId: string
  groupName: string
  contentType: SyncContentType
  finishedAt: number
  targets: Array<{
    accountId: string
    platform: PlatformType
    displayName: string
    status: PublishTargetStatus
    error?: string
    postUrl?: string
  }>
}

// 发布 Group 配置
export interface PublishGroupConfig {
  contentType: SyncContentType
  targets: Array<{
    accountId: string
    platform: PlatformType
    displayName: string
  }>
  data: SyncContentData
}

// 发布 Group 完整信息
export interface PublishGroup {
  id: string
  name: string // "发布 #1"
  contentType: SyncContentType
  data: SyncContentData
  status: PublishGroupStatus
  targets: Array<{
    accountId: string
    platform: PlatformType
    displayName: string
    status: PublishTargetStatus
    error?: string
    postUrl?: string
    extensionKey?: string
  }>
  activeAccountId: string | null
  createdAt: number
}

// Global toast overlay: JSON-only payload bridged from any renderer to the
// transparent toast overlay WebContentsView. ReactNode titles, action/cancel
// callbacks, promise and custom toasts are intentionally unsupported — they
// can't cross IPC under contextIsolation.
export type DesktopToastMethod =
  | 'default'
  | 'success'
  | 'error'
  | 'loading'
  | 'info'
  | 'warning'
  | 'message'

export interface DesktopToastPayload {
  id: string
  method: DesktopToastMethod
  title: string
  description?: string
  // ms; Infinity means a sticky toast. Electron IPC uses the structured clone
  // algorithm, so Infinity survives the trip intact.
  duration?: number
}

// Reported by the overlay renderer so main can size/detach the overlay view to
// exactly cover the visible toast stack (and pass clicks through elsewhere).
export interface DesktopToastOverlaySize {
  width: number
  height: number
}

// Window state
export interface WindowState {
  width: number
  height: number
  x?: number
  y?: number
  isMaximized: boolean
}

// Store types
export interface AppStore {
  windowState: WindowState
  theme: 'light' | 'dark' | 'system'
  language: 'zh-CN' | 'en-US'
}

// Updater types
export interface UpdateProgress {
  bytesPerSecond: number
  percent: number
  transferred: number
  total: number
}

export interface UpdateInfo {
  version: string
  releaseDate?: string
  releaseNotes?: string | ReleaseNoteInfo[]
}

export interface ReleaseNoteInfo {
  version: string
  note: string
}

export interface UpdateStatus {
  status: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  info?: UpdateInfo
  progress?: UpdateProgress
  error?: string
}

// KeepAlive types
export interface KeepAliveConfig {
  enabled: boolean
  intervalHours: number
}

export interface KeepAliveAccountResult {
  accountId: string
  platform: PlatformType
  displayName: string
  success: boolean
  stillLoggedIn: boolean
  /** The login check itself errored: status unknown, nothing written to DB */
  checkFailed?: boolean
  error?: string
}

export interface KeepAliveStatus {
  isRunning: boolean
  enabled: boolean
  intervalHours: number
  lastRunAt: number | null
  nextRunAt: number | null
  lastResults: KeepAliveAccountResult[]
}

// External operations API (local HTTP + MCP server) settings
export interface ExternalApiSettings {
  enabled: boolean
  port: number
  token: string
}
