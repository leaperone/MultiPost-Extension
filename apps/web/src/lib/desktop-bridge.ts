/**
 * Desktop Bridge SDK
 *
 * 提供 Web 页面与 Desktop Electron 应用通信的桥接层
 * 在 Desktop WebView 中，window.multipost 由 Electron preload 脚本注入
 * 在普通浏览器中，window.multipost 不存在，需要降级处理
 */

// ============================================================================
// Types
// ============================================================================

export type PlatformType =
  | 'weibo'
  | 'xiaohongshu'
  | 'twitter'
  | 'douyin'
  | 'bilibili'
  | 'zhihu'
  | 'wechat'
  | 'tiktok'
  | 'instagram'
  | 'facebook'
  | 'linkedin'
  | 'youtube'
  | 'threads'
  | 'bluesky'
  | string

export type ContentType = 'DYNAMIC' | 'VIDEO' | 'ARTICLE' | 'PODCAST'

export type PublishStatus =
  | 'idle'
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface ProxyConfig {
  protocol: 'http' | 'https' | 'socks5'
  host: string
  port: number
  username?: string
  password?: string
}

export interface Account {
  id: string
  platform: PlatformType
  username: string
  displayName?: string
  remark?: string
  avatar?: string
  isLoggedIn: boolean
  lastLoginAt?: number
  groupId?: string
  sessionPartition?: string
  proxyConfig?: ProxyConfig
  isDefault: boolean
  createdAt: number
  updatedAt: number
}

export interface AccountGroup {
  id: string
  name: string
  color?: string
  order: number
  createdAt: number
  updatedAt: number
}

export interface Draft {
  id: string
  title: string
  contentType: ContentType
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

export interface PublishHistory {
  id: string
  contentType: ContentType
  title: string
  content: string
  platform: PlatformType
  accountId: string
  status: 'success' | 'failed' | 'pending'
  errorMessage?: string
  platformPostId?: string
  platformPostUrl?: string
  publishedAt: number
  createdAt: number
}

export interface ScheduledPublish {
  id: string
  contentType: ContentType
  data: Record<string, unknown>
  platforms: PlatformType[]
  accountIds: string[]
  scheduledAt: number
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  createdAt: number
  updatedAt: number
}

export interface PlatformInfo {
  id: PlatformType
  name: string
  icon: string
  iconifyIcon?: string
  faviconUrl?: string
  accountKey?: string
  supportedContentTypes: ContentType[]
  loginUrl: string
}

export interface UpdateInfo {
  version: string
  releaseNotes: string
  releaseDate: string
}

export interface LoginStatusResult {
  isLoggedIn: boolean
  userInfo?: {
    username: string
    avatar?: string
  }
}

export interface PublishTarget {
  accountId: string
  platform: PlatformType
  displayName?: string
}

export interface PublishResult {
  success: boolean
  platformPostId?: string
  platformPostUrl?: string
  error?: string
}

export interface DynamicData {
  title?: string
  content: string
  images?: string[]
  videos?: string[]
}

export interface VideoData {
  title: string
  content: string
  video: string
  tags?: string[]
  cover?: string
  verticalCover?: string
  scheduledPublishTime?: number
}

export interface ArticleData {
  title: string
  digest: string
  cover: string
  htmlContent: string
  markdownContent: string
  images?: string[]
}

export interface PodcastData {
  title: string
  description: string
  audio: string
}

export type PublishData = DynamicData | VideoData | ArticleData | PodcastData

export interface PublishParams {
  contentType: ContentType
  accountId: string
  data: PublishData
  autoSubmit?: boolean
}

export interface ExecutorPublishParams {
  contentType: ContentType
  targets: PublishTarget[]
  data: PublishData
  autoSubmit?: boolean
}

export interface FileSelectOptions {
  filters?: { name: string; extensions: string[] }[]
  multiple?: boolean
}

// ============================================================================
// API Interfaces
// ============================================================================

interface AccountAPI {
  list(): Promise<Account[]>
  get(id: string): Promise<Account | null>
  create(platform: PlatformType): Promise<Account>
  update(id: string, data: Partial<Account>): Promise<Account>
  delete(id: string): Promise<void>
  setDefault(id: string): Promise<void>
  checkLoginStatus(id: string): Promise<boolean>
  openLogin(id: string): Promise<void>
}

interface GroupAPI {
  list(): Promise<AccountGroup[]>
  get(id: string): Promise<AccountGroup | null>
  create(data: { name: string; color?: string }): Promise<AccountGroup>
  update(id: string, data: Partial<AccountGroup>): Promise<AccountGroup>
  delete(id: string): Promise<void>
}

interface BrowserAPI {
  open(accountId: string, url?: string): Promise<void>
  close(accountId: string): Promise<void>
  show(accountId: string): Promise<void>
  hide(accountId: string): Promise<void>
  navigate(accountId: string, url: string): Promise<void>
  execute(accountId: string, script: string): Promise<unknown>
  getLoginStatus(accountId: string): Promise<LoginStatusResult>
}

interface PublishAPI {
  start(params: PublishParams): Promise<PublishResult>
  startInExecutor(params: ExecutorPublishParams): Promise<void>
  getStatus(taskId: string): Promise<PublishStatus>
  cancel(taskId: string): Promise<void>
}

interface DraftAPI {
  list(): Promise<Draft[]>
  get(id: string): Promise<Draft | null>
  create(data: Omit<Draft, 'id' | 'createdAt' | 'updatedAt'>): Promise<Draft>
  update(id: string, data: Partial<Draft>): Promise<Draft>
  delete(id: string): Promise<void>
}

interface HistoryAPI {
  list(options?: { limit?: number; offset?: number }): Promise<PublishHistory[]>
  get(id: string): Promise<PublishHistory | null>
  delete(id: string): Promise<void>
}

interface ScheduledAPI {
  list(): Promise<ScheduledPublish[]>
  get(id: string): Promise<ScheduledPublish | null>
  create(
    data: Omit<ScheduledPublish, 'id' | 'createdAt' | 'updatedAt' | 'status'>
  ): Promise<ScheduledPublish>
  update(id: string, data: Partial<ScheduledPublish>): Promise<ScheduledPublish>
  delete(id: string): Promise<void>
  cancel(id: string): Promise<void>
}

interface AppAPI {
  getVersion(): Promise<string>
  getPlatforms(): Promise<PlatformInfo[]>
  checkUpdate(): Promise<UpdateInfo | null>
  downloadUpdate(): Promise<void>
  installUpdate(): Promise<void>
  openExternal(url: string): Promise<void>
  selectFile(options?: FileSelectOptions): Promise<string[]>
  selectDirectory(): Promise<string | null>
  /**
   * 读取文件内容为 Base64 字符串
   * @param filePath 文件的绝对路径
   * @returns Base64 编码的文件内容（包含 data URL 前缀，如 data:image/png;base64,xxx）
   */
  readFileAsDataURL(filePath: string): Promise<string>
}

interface LayoutAPI {
  setSidebarWidth(width: number): Promise<void>
  getWindowSize(): Promise<{ width: number; height: number }>
  minimize(): Promise<void>
  maximize(): Promise<void>
  close(): Promise<void>
}

interface NavigationAPI {
  reportPath(path: string): void
  navigateTo(path: string): void
}

// ============================================================================
// Event Types
// ============================================================================

export type MultiPostEvent =
  | 'account:login'
  | 'account:logout'
  | 'publish:start'
  | 'publish:progress'
  | 'publish:complete'
  | 'publish:error'
  | 'update:available'
  | 'update:downloaded'
  | 'window:resize'

export interface PublishProgressEvent {
  accountId: string
  platform: PlatformType
  status: PublishStatus
  progress?: number
  message?: string
}

export interface AccountLoginEvent {
  account: Account
}

export interface UpdateAvailableEvent {
  version: string
  releaseNotes: string
}

export interface WindowResizeEvent {
  width: number
  height: number
}

type EventCallback<T = unknown> = (data: T) => void

// ============================================================================
// Bridge Interface
// ============================================================================

export interface MultiPostBridge {
  env: {
    isDesktop: boolean
    version: string
    platform: 'darwin' | 'win32' | 'linux'
  }

  account: AccountAPI
  group: GroupAPI
  browser: BrowserAPI
  publish: PublishAPI
  draft: DraftAPI
  history: HistoryAPI
  scheduled: ScheduledAPI
  app: AppAPI
  layout: LayoutAPI
  navigation: NavigationAPI

  on<T = unknown>(event: MultiPostEvent, callback: EventCallback<T>): void
  off<T = unknown>(event: MultiPostEvent, callback: EventCallback<T>): void
}

// Extend Window interface
declare global {
  interface Window {
    multipost?: MultiPostBridge
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 检查当前环境是否为 Desktop WebView
 */
export function isDesktop(): boolean {
  return typeof window !== 'undefined' && !!window.multipost?.env?.isDesktop
}

/**
 * 获取 Desktop Bridge 实例
 * 如果不在 Desktop 环境中，返回 null
 */
export function getDesktopBridge(): MultiPostBridge | null {
  if (isDesktop()) {
    return window.multipost!
  }
  return null
}

/**
 * 获取 Desktop 环境信息
 */
export function getDesktopEnv(): MultiPostBridge['env'] | null {
  return window.multipost?.env ?? null
}

/**
 * 安全调用 Desktop API
 * 如果不在 Desktop 环境中，返回默认值或执行降级逻辑
 */
export async function callDesktopAPI<T>(
  apiCall: (bridge: MultiPostBridge) => Promise<T>,
  fallback?: T | (() => Promise<T>)
): Promise<T | undefined> {
  const bridge = getDesktopBridge()
  if (bridge) {
    return apiCall(bridge)
  }
  if (fallback !== undefined) {
    return typeof fallback === 'function'
      ? (fallback as () => Promise<T>)()
      : fallback
  }
  return undefined
}

/**
 * 订阅 Desktop 事件
 * 返回取消订阅函数
 */
export function subscribeDesktopEvent<T = unknown>(
  event: MultiPostEvent,
  callback: EventCallback<T>
): () => void {
  const bridge = getDesktopBridge()
  if (bridge) {
    bridge.on(event, callback)
    return () => bridge.off(event, callback)
  }
  return () => {}
}

// ============================================================================
// React Hooks (for use in components)
// ============================================================================

import { useCallback, useEffect, useState } from 'react'

/**
 * Hook: 检查是否在 Desktop 环境
 */
export function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(false)

  useEffect(() => {
    setDesktop(isDesktop())
  }, [])

  return desktop
}

/**
 * Hook: 获取 Desktop Bridge
 */
export function useDesktopBridge(): MultiPostBridge | null {
  const [bridge, setBridge] = useState<MultiPostBridge | null>(null)

  useEffect(() => {
    setBridge(getDesktopBridge())
  }, [])

  return bridge
}

/**
 * Hook: 订阅 Desktop 事件
 */
export function useDesktopEvent<T = unknown>(
  event: MultiPostEvent,
  callback: EventCallback<T>
): void {
  useEffect(() => {
    return subscribeDesktopEvent(event, callback)
  }, [event, callback])
}

/**
 * Hook: 获取账号列表
 */
export function useDesktopAccounts(): {
  accounts: Account[]
  loading: boolean
  error: Error | null
  refresh: () => Promise<void>
} {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    const bridge = getDesktopBridge()
    if (!bridge) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const data = await bridge.account.list()
      setAccounts(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch accounts'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // 监听账号变化事件
  useDesktopEvent('account:login', refresh)
  useDesktopEvent('account:logout', refresh)

  return { accounts, loading, error, refresh }
}

/**
 * Hook: 获取草稿列表
 */
export function useDesktopDrafts(): {
  drafts: Draft[]
  loading: boolean
  error: Error | null
  refresh: () => Promise<void>
} {
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    const bridge = getDesktopBridge()
    if (!bridge) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const data = await bridge.draft.list()
      setDrafts(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch drafts'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { drafts, loading, error, refresh }
}

/**
 * Hook: 获取发布历史
 */
export function useDesktopHistory(options?: {
  limit?: number
  offset?: number
}): {
  history: PublishHistory[]
  loading: boolean
  error: Error | null
  refresh: () => Promise<void>
} {
  const [history, setHistory] = useState<PublishHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    const bridge = getDesktopBridge()
    if (!bridge) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const data = await bridge.history.list(options)
      setHistory(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch history'))
    } finally {
      setLoading(false)
    }
  }, [options])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { history, loading, error, refresh }
}

/**
 * Hook: 获取平台列表
 */
export function useDesktopPlatforms(): {
  platforms: PlatformInfo[]
  loading: boolean
  error: Error | null
} {
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const bridge = getDesktopBridge()
    if (!bridge) {
      setLoading(false)
      return
    }

    bridge.app
      .getPlatforms()
      .then((data) => {
        setPlatforms(data)
        setError(null)
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error('Failed to fetch platforms'))
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  return { platforms, loading, error }
}

/**
 * Hook: 发布进度监听
 */
export function usePublishProgress(
  onProgress?: (event: PublishProgressEvent) => void,
  onComplete?: () => void,
  onError?: (error: string) => void
): void {
  useDesktopEvent<PublishProgressEvent>('publish:progress', (event) => {
    onProgress?.(event)
  })

  useDesktopEvent('publish:complete', () => {
    onComplete?.()
  })

  useDesktopEvent<{ error: string }>('publish:error', (event) => {
    onError?.(event.error)
  })
}

// ============================================================================
// Publish Group Types & API
// ============================================================================

export type PublishGroupStatus = "preparing" | "publishing" | "completed" | "failed"
export type PublishTargetStatus = "pending" | "filling" | "ready" | "success" | "failed"

export interface GroupTab {
  id: string
  groupId: string
  platform: PlatformType
  displayName: string
  status: PublishTargetStatus
  isActive: boolean
}

export interface PublishGroup {
  id: string
  name: string
  contentType: ContentType
  data: PublishData
  status: PublishGroupStatus
  targets: Array<{
    accountId: string
    platform: PlatformType
    displayName: string
    status: PublishTargetStatus
  }>
  activeAccountId: string | null
  createdAt: number
}

export interface PublishGroupCreateParams {
  contentType: ContentType
  targets: Array<{
    accountId: string
    platform: PlatformType
    displayName: string
  }>
  data: PublishData
}

interface PublishGroupAPI {
  create(params: PublishGroupCreateParams): Promise<string>
  show(groupId: string): Promise<void>
  switchTab(groupId: string, accountId: string): Promise<void>
  close(groupId: string): Promise<void>
  getTabs(groupId: string): Promise<GroupTab[]>
  get(groupId: string): Promise<PublishGroup | null>
  fill(groupId: string): Promise<void>
  submitAll(groupId: string): Promise<void>
  getActiveGroupId(): Promise<string | null>
}

/**
 * 获取 Publish Group API
 */
export function getPublishGroupAPI(): PublishGroupAPI | null {
  const bridge = window.multipost as any
  if (!bridge?.publishGroup) {
    return null
  }
  return bridge.publishGroup as PublishGroupAPI
}

export function getDesktopErrorMessage(error: unknown, fallback = '操作失败'): string {
  if (error instanceof Error && error.message) {
    return error.message
  }
  if (typeof error === 'string' && error.trim()) {
    return error
  }
  return fallback
}

/**
 * Hook: 使用 Publish Group API
 */
export function usePublishGroup(): PublishGroupAPI | null {
  const [api, setApi] = useState<PublishGroupAPI | null>(null)

  useEffect(() => {
    setApi(getPublishGroupAPI())
  }, [])

  return api
}

/**
 * 创建发布 Group 并打开
 */
export async function createAndShowPublishGroup(
  params: PublishGroupCreateParams
): Promise<string | null> {
  const api = getPublishGroupAPI()
  if (!api) {
    console.warn("[Desktop Bridge] PublishGroup API not available")
    return null
  }

  try {
    const groupId = await api.create(params)
    console.log("[Desktop Bridge] Created publish group:", groupId)
    return groupId
  } catch (error) {
    console.error("[Desktop Bridge] Failed to create publish group:", error)
    throw error
  }
}
