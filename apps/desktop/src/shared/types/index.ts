// Re-export fingerprint types
export * from './fingerprint'

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
  // 文章平台
  | 'csdn'
  | 'jianshu'
  | 'segmentfault'
  | 'sspai'
  | '51cto'
  | 'wordpress'

export interface PlatformInfo {
  id: PlatformType
  name: string
  icon: string
  iconifyIcon?: string // Iconify icon identifier, e.g. 'simple-icons:bilibili'
  faviconUrl?: string // Platform favicon URL as fallback
  url: string
  loginUrl: string
  supportedContentTypes: SyncContentType[]
}

// Content types - matching browser extension
export type SyncContentType = 'DYNAMIC' | 'VIDEO' | 'ARTICLE' | 'PODCAST'

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
export interface Account {
  id: string
  platform: PlatformType
  username: string
  displayName?: string
  avatar?: string
  isLoggedIn: boolean
  lastLoginAt?: number
  groupId?: string
  sessionPartition: string
  isDefault: boolean
  createdAt: number
  updatedAt: number
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

  // BrowserView management
  'browser:open': (accountId: string, url?: string) => Promise<void>
  'browser:close': (accountId: string) => Promise<void>
  'browser:show': (accountId: string) => Promise<void>
  'browser:hide': (accountId: string) => Promise<void>
  'browser:navigate': (accountId: string, url: string) => Promise<void>
  'browser:execute': (accountId: string, script: string) => Promise<unknown>
  'browser:getLoginStatus': (accountId: string) => Promise<boolean>

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
  isHome: boolean // 首页 tab 不能关闭
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
export interface KeepAliveAccountResult {
  accountId: string
  platform: PlatformType
  displayName: string
  success: boolean
  stillLoggedIn: boolean
  error?: string
}

export interface KeepAliveStatus {
  isRunning: boolean
  lastRunAt: number | null
  lastResults: KeepAliveAccountResult[]
}
