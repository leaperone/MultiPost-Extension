import {
  WebContentsView,
  BrowserWindow,
  Notification,
  session,
  ipcMain,
  dialog,
  type Session,
  type WebPreferences
} from 'electron'
import { join, basename, extname } from 'path'
import { v4 as uuidv4 } from 'uuid'
import { is } from '@electron-toolkit/utils'
import {
  createLocalFileUrl,
  hasAccountStatMetrics,
  isAnalyticsSupported,
  toPublicAccount,
  type Account,
  type AccountAnalytics,
  type AccountComment,
  type AccountHealthStatus,
  type AccountPost,
  type AccountStats,
  type DmMessage,
  type DmSession,
  type PlatformType,
  type SyncContentType,
  type SyncContentData,
  type BrowserTab,
  type GroupTab,
  type PublishGroupStatus,
  type PublishGroupSummary,
  type PublishTargetStatus,
  type PublishGroup,
  type PublishEventPayload,
  type PublishEventStatus,
  type PublishStatus,
  type PublishStatusSnapshot,
  type PublishTargetResult,
  type PublishHistory,
  type DesktopToastPayload,
  type DesktopToastOverlaySize
} from '../../shared/types'
import { IPC_CHANNELS, PLATFORMS, PLATFORM_PUBLISH_URLS } from '../../shared/constants'
import { getAdapter } from '../platforms'
import { publishLogger } from '../logger'
import { getMimeType } from '../utils/mime'
import {
  allowLocalFile,
  allowLocalFileUrl,
  hardenSession,
  registerLocalFileProtocol
} from './sessionHardening'
import { DatabaseService } from '../database'
import {
  executeExtensionFill,
  getExtensionInjectUrl,
  type ExtensionFillResult
} from '../injectors'
import {
  getDesktopInjectorManifestEntry,
  type DesktopInjectorManifestEntry
} from '../injectors/manifest'
import {
  acquireAccountProxyForSession,
  applyAccountProxy,
  applyAccountProxyToTrackedAccountSessions,
  releaseAccountProxyForSession,
  releaseAccountProxyForWebContents,
  trackAccountProxyForWebContents,
  withAccountProxySession
} from '../proxy/accountProxy'
import { registerGlobalProxySession } from '../proxy/proxyManager'
import { isSupportedBrowserNavigationUrl, openExternalUrl } from './externalUrl'
import {
  fetchSessionUserInfo,
  matchesLoginCookies,
  PLATFORM_LOGIN_COOKIES,
  probeXiaohongshuHealth
} from './accountUserInfo'
import { fetchAccountAnalytics } from './accountAnalytics'
import {
  createComment,
  listComments,
  listDmMessages,
  listDmSessions,
  listPosts,
  sendDm
} from './accountInteractions'

interface ManagedBrowserView {
  view: WebContentsView
  accountId: string
  platform: PlatformType
  isVisible: boolean
  title: string
  url: string
  isHome: boolean // 首页 tab 不能关闭
}

// Platform-based views (without accountId)
interface PlatformBrowserView {
  view: WebContentsView
  platform: PlatformType
  isVisible: boolean
}

// Executor views (keyed by accountId for multi-account support)
interface ExecutorBrowserView {
  view: WebContentsView
  accountId: string
  platform: PlatformType
  isVisible: boolean
}

// Publish Group view - contains multiple BrowserViews for different accounts
interface PublishGroupView {
  id: string
  name: string // "发布 #1"
  contentType: SyncContentType
  data: SyncContentData
  status: PublishGroupStatus
  views: Map<
    string,
    {
      view: WebContentsView
      accountId: string
      platform: PlatformType
      displayName: string
      status: PublishTargetStatus
      isVisible: boolean
      /** Step currently executing, surfaced live in the progress UI. */
      currentStep?: string
      error?: string
      postUrl?: string
      extensionKey?: string
    }
  >
  activeAccountId: string | null
  createdAt: number
  autoPublish: boolean
  autoCloseDelay: number // seconds
}

type GroupFillResults = Map<string, ExtensionFillResult>
type NavigationGuardableWebContents = Electron.WebContents & {
  on(
    event: 'will-frame-navigate',
    listener: (event: Electron.Event, url: string) => void
  ): Electron.WebContents
}

interface ExecutorPublishTargetState {
  accountId: string
  platform: PlatformType
  contentType: SyncContentType
  status: PublishTargetStatus
  error?: string
  postUrl?: string
  extensionKey?: string
}

interface PublishHistoryContent {
  title: string
  content: string
}

interface PublishHistoryTarget {
  accountId: string
  platform: PlatformType
  status: PublishTargetStatus
  error?: string
  postUrl?: string
}

interface ExecutorPublishRun {
  id: string
  contentType: SyncContentType
  historyContent: PublishHistoryContent
  status: PublishGroupStatus
  targets: Map<string, ExecutorPublishTargetState>
  createdAt: number
  updatedAt: number
  cancelled: boolean
}

// Publish flow timing: max wait for a platform page before the step is marked
// as timed out (user can retry/skip from the progress card), plus a short
// settle after readyState=complete for SPA hydration.
const PAGE_READY_TIMEOUT_MS = 60_000
const PAGE_READY_SETTLE_MS = 500

// Layout constants
const TABBAR_HEIGHT = 72
const TOOLBAR_HEIGHT = 40
const DEFAULT_SIDEBAR_WIDTH = 256 // 16rem expanded
// Fixed width of the transparent toast overlay (sonner toast ~356 + side
// offsets). Its height is driven by the overlay's own measurement.
const TOAST_OVERLAY_WIDTH = 420
// IPC for the toast overlay is process-global; register it only once even if
// the manager is ever recreated.
let toastOverlayIpcRegistered = false
const PUBLISH_SNAPSHOT_LIMIT = 50
const PUBLISH_SNAPSHOT_TTL_MS = 10 * 60 * 1000

// Home tab constants - the home tab renders the native renderer UI.
// The web dashboard is an optional, closable tab backed by a lazily
// created WebContentsView.
const HOME_TAB_ID = '__home__'
const WEB_TAB_ID = '__web__'

const WEB_DASHBOARD_BASE_URL = is.dev
  ? process.env.MULTIPOST_WEB_URL || 'http://localhost:3000'
  : 'https://multipost.app'

const CHROMIUM_NET_ERROR_PATTERN = /\b(ERR_[A-Z0-9_]+)\s*\((-?\d+)\)/
const CHROMIUM_NET_ERROR_NAME_PATTERN = /\b(ERR_[A-Z0-9_]+)\b/
const NAVIGATION_ABORT_ERROR_NAMES = new Set(['ERR_ABORTED'])
const NAVIGATION_ABORT_ERROR_CODES = new Set([-3])
const NAVIGATION_NETWORK_ERROR_NAMES = new Set([
  'ERR_FAILED',
  'ERR_CONNECTION_TIMED_OUT',
  'ERR_INTERNET_DISCONNECTED',
  'ERR_NAME_NOT_RESOLVED',
  'ERR_CONNECTION_REFUSED',
  'ERR_CONNECTION_RESET',
  'ERR_ADDRESS_UNREACHABLE',
  'ERR_NETWORK_CHANGED',
  'ERR_PROXY_CONNECTION_FAILED',
  'ERR_TUNNEL_CONNECTION_FAILED',
  'ERR_TIMED_OUT',
  'ERR_SSL_PROTOCOL_ERROR',
  'ERR_CERT_AUTHORITY_INVALID',
  'ERR_CERT_COMMON_NAME_INVALID',
  'ERR_CERT_DATE_INVALID'
])
const NAVIGATION_NETWORK_ERROR_CODES = new Set([
  -2, -6, -7, -21, -100, -101, -102, -103, -104, -105, -106, -109, -118, -130,
  -137, -138, -200, -201, -202, -324
])

interface NavigationErrorDetails {
  kind: 'abort' | 'network' | 'fatal'
  message: string
  netErrorName?: string
  netErrorCode?: number
}

interface NavigationLoadResult {
  ok: boolean
  kind?: 'abort' | 'network'
  message?: string
  details?: NavigationErrorDetails
}

type FetchedAccountUserInfo = {
  username: string
  displayName?: string
  avatar?: string
  stats?: AccountStats
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function stringifyUnknown(value: unknown): string {
  if (value instanceof Error) {
    return value.message
  }
  if (typeof value === 'string') {
    return value
  }
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function readOptionalStringField(value: unknown, field: string): string | undefined {
  if (!isRecord(value)) return undefined
  const fieldValue = value[field]
  return typeof fieldValue === 'string' ? fieldValue : undefined
}

function readOptionalNumberField(value: unknown, field: string): number | undefined {
  if (!isRecord(value)) return undefined
  const fieldValue = value[field]
  if (typeof fieldValue === 'number' && Number.isFinite(fieldValue)) {
    return fieldValue
  }
  if (typeof fieldValue === 'string') {
    const numericValue = Number(fieldValue)
    return Number.isFinite(numericValue) ? numericValue : undefined
  }
  return undefined
}

function getNavigationErrorMessage(error: unknown): string {
  const message = readOptionalStringField(error, 'message')
  return message || stringifyUnknown(error)
}

function classifyNavigationError(error: unknown): NavigationErrorDetails {
  const message = getNavigationErrorMessage(error)
  const parsed = CHROMIUM_NET_ERROR_PATTERN.exec(message)
  const parsedName = parsed?.[1]
  const parsedCode = parsed?.[2] ? Number(parsed[2]) : undefined
  const fallbackName =
    readOptionalStringField(error, 'code')?.startsWith('ERR_') === true
      ? readOptionalStringField(error, 'code')
      : CHROMIUM_NET_ERROR_NAME_PATTERN.exec(message)?.[1]
  const netErrorName = parsedName ?? fallbackName
  const netErrorCode =
    parsedCode ??
    readOptionalNumberField(error, 'errno') ??
    readOptionalNumberField(error, 'code')

  if (
    (netErrorName && NAVIGATION_ABORT_ERROR_NAMES.has(netErrorName)) ||
    (netErrorCode !== undefined && NAVIGATION_ABORT_ERROR_CODES.has(netErrorCode))
  ) {
    return { kind: 'abort', message, netErrorName, netErrorCode }
  }

  if (
    (netErrorName && NAVIGATION_NETWORK_ERROR_NAMES.has(netErrorName)) ||
    (netErrorCode !== undefined && NAVIGATION_NETWORK_ERROR_CODES.has(netErrorCode))
  ) {
    return { kind: 'network', message, netErrorName, netErrorCode }
  }

  return { kind: 'fatal', message, netErrorName, netErrorCode }
}

// This preload only injects a page-world helper on allowlisted platform hosts.
// It must not expose app IPC or Node APIs to third-party content.
function createThirdPartyContentWebPreferences(ses: Session): WebPreferences {
  return {
    preload: join(__dirname, '../preload/injector-helper.js'),
    session: ses,
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true
  }
}

export class BrowserViewManager {
  private mainWindow: BrowserWindow
  private views: Map<string, ManagedBrowserView> = new Map()
  private platformViews: Map<PlatformType, PlatformBrowserView> = new Map()
  // Executor views keyed by accountId (supports multiple accounts per platform)
  private executorViews: Map<string, ExecutorBrowserView> = new Map()
  private activeViewId: string | null = null
  private activePlatformId: PlatformType | null = null
  // Active executor is now tracked by accountId
  private activeExecutorId: string | null = null
  private sidebarWidth: number = DEFAULT_SIDEBAR_WIDTH
  // Optional web dashboard WebContentsView - created lazily when the user opens
  // the web workspace tab; the home tab itself is rendered natively.
  private webDashboardView: WebContentsView | null = null
  // Tab bar WebContentsView - always on top
  private tabBarView: WebContentsView | null = null
  // Transparent toast overlay WebContentsView - floats above everything (incl.
  // tabBarView); main sizes it to hug the visible toast stack, or parks it
  // off-window when empty so clicks pass through elsewhere.
  private toastOverlayView: WebContentsView | null = null
  private toastOverlaySize: DesktopToastOverlaySize | null = null
  private toastOverlayReady = false
  private pendingToastMessages: Array<{ channel: string; payload: unknown }> = []
  // Publish Groups - 发布 Group 管理
  private publishGroups: Map<string, PublishGroupView> = new Map()
  private executorPublishRuns: Map<string, ExecutorPublishRun> = new Map()
  private publishStatusSnapshots: Map<string, PublishStatusSnapshot> = new Map()
  private cancelledPublishIds: Set<string> = new Set()
  private finalizedPublishRunIds: Set<string> = new Set()
  private notifiedGroupIds: Set<string> = new Set()
  private summaryEmittedGroupIds: Set<string> = new Set()
  private emittedPublishErrorKeys: Set<string> = new Set()
  private publishHistoryAttemptByTarget: Map<string, number> = new Map()
  private persistedPublishHistoryKeys: Set<string> = new Set()
  private platformPublishPayloads: Map<string, SyncContentData> = new Map()
  private executorPublishPayloads: Map<string, SyncContentData> = new Map()
  private activeGroupId: string | null = null
  private groupCounter: number = 0 // 用于生成 Group 名称

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow

    // Listen for window resize/maximize/unmaximize to update all view bounds
    const updateBounds = (): void => {
      this.updateAllViewBounds()
    }
    this.mainWindow.on('resize', updateBounds)
    this.mainWindow.on('maximize', updateBounds)
    this.mainWindow.on('unmaximize', updateBounds)
    // Re-assert bounds when the window becomes visible again: while occluded
    // (e.g. locked screen) Chromium defers WebContentsView resizes, so bounds
    // changed in the background may not have reached the renderer.
    this.mainWindow.on('show', updateBounds)
    this.mainWindow.on('focus', updateBounds)
    this.mainWindow.on('restore', updateBounds)
  }

  private blockUnsupportedNavigation(
    url: string,
    source: string,
    event?: { preventDefault: () => void }
  ): boolean {
    if (isSupportedBrowserNavigationUrl(url)) {
      return false
    }

    event?.preventDefault()
    publishLogger.warn(`Blocked unsupported navigation from ${source}:`, url)
    void openExternalUrl(url)
    return true
  }

  private installNavigationGuard(webContents: Electron.WebContents, source: string): void {
    const guard = (event: Electron.Event, url: string): void => {
      this.blockUnsupportedNavigation(url, source, event)
    }

    webContents.on('will-navigate', guard)
    ;(webContents as NavigationGuardableWebContents).on('will-frame-navigate', guard)
    webContents.on('will-redirect', guard)
  }

  private installThirdPartyWindowOpenHandler(view: WebContentsView, ses: Session): void {
    view.webContents.setWindowOpenHandler(({ url, disposition }) => {
      if (disposition === 'new-window') {
        return {
          action: 'allow',
          createWindow: (options) => {
            const child = new BrowserWindow({
              ...options,
              autoHideMenuBar: true,
              webPreferences: createThirdPartyContentWebPreferences(ses)
            })
            this.installNavigationGuard(child.webContents, `child-window:${url}`)
            trackAccountProxyForWebContents(child.webContents)
            child.once('ready-to-show', () => {
              if (!child.isDestroyed()) {
                child.show()
              }
            })
            return child.webContents
          }
        }
      }

      if (this.blockUnsupportedNavigation(url, 'window-open')) {
        return { action: 'deny' }
      }

      try {
        void view.webContents.loadURL(url).catch((error) => {
          publishLogger.warn('Failed to navigate window-open URL:', error)
        })
      } catch (error) {
        publishLogger.warn('Failed to navigate window-open URL:', error)
      }
      return { action: 'deny' }
    })
  }

  private formatPublishError(error: unknown): string {
    if (error instanceof Error) {
      return error.message
    }
    if (typeof error === 'string') {
      return error
    }
    try {
      return JSON.stringify(error)
    } catch {
      return String(error)
    }
  }

  private describeNavigationFailure(details: NavigationErrorDetails): string {
    const suffix =
      details.netErrorName && details.netErrorCode !== undefined
        ? `${details.netErrorName} (${details.netErrorCode})`
        : details.netErrorName || details.message

    switch (details.netErrorName) {
      case 'ERR_NAME_NOT_RESOLVED':
        return `无法解析平台地址：${suffix}`
      case 'ERR_INTERNET_DISCONNECTED':
        return `网络未连接：${suffix}`
      case 'ERR_CONNECTION_TIMED_OUT':
      case 'ERR_TIMED_OUT':
        return `打开页面超时：${suffix}`
      case 'ERR_CONNECTION_REFUSED':
        return `平台连接被拒绝：${suffix}`
      case 'ERR_CONNECTION_RESET':
        return `网络连接被重置：${suffix}`
      case 'ERR_PROXY_CONNECTION_FAILED':
      case 'ERR_TUNNEL_CONNECTION_FAILED':
        return `代理连接失败：${suffix}`
      default:
        return `网络连接失败：${suffix}`
    }
  }

  private async loadURLWithNavigationHandling(
    webContents: Electron.WebContents,
    url: string,
    context: string
  ): Promise<NavigationLoadResult> {
    try {
      await webContents.loadURL(url)
      return { ok: true }
    } catch (error: unknown) {
      const details = classifyNavigationError(error)
      if (details.kind === 'fatal') {
        throw error
      }

      const payload = {
        url,
        message: details.message,
        netErrorName: details.netErrorName,
        netErrorCode: details.netErrorCode
      }
      if (details.kind === 'abort') {
        publishLogger.info(`${context} navigation aborted:`, payload)
      } else {
        publishLogger.warn(`${context} navigation failed:`, payload)
      }

      return {
        ok: false,
        kind: details.kind,
        message: this.describeNavigationFailure(details),
        details
      }
    }
  }

  private throwIfPublishNavigationFailed(
    result: NavigationLoadResult,
    action: string
  ): void {
    if (result.ok || result.kind !== 'network') {
      return
    }
    throw new Error(`${action}失败：${result.message || '网络连接失败'}`)
  }

  private getPlatformPublishPayloadKey(platform: PlatformType, contentType: SyncContentType): string {
    return `${platform}:${contentType}`
  }

  private getExecutorPublishPayloadKey(accountId: string, contentType: SyncContentType): string {
    return `${accountId}:${contentType}`
  }

  private clearPublishPayloadsForPrefix(cache: Map<string, SyncContentData>, prefix: string): void {
    for (const key of Array.from(cache.keys())) {
      if (key.startsWith(prefix)) {
        cache.delete(key)
      }
    }
  }

  private hasCookieForDomain(cookies: Electron.Cookie[], domain: string): boolean {
    const normalizedDomain = domain.replace(/^\./, '').toLowerCase()
    return cookies.some((cookie) => {
      const cookieDomain = cookie.domain?.replace(/^\./, '').toLowerCase()
      return cookieDomain === normalizedDomain || cookieDomain?.endsWith(`.${normalizedDomain}`) === true
    })
  }

  private hasCookieForAnyDomain(cookies: Electron.Cookie[], domains: string[]): boolean {
    return domains.some((domain) => this.hasCookieForDomain(cookies, domain))
  }

  /**
   * Broadcast an event to every webContents hosting app UI. The main window
   * itself only holds a blank page (all UI lives in BrowserViews), so events
   * sent solely to mainWindow.webContents would never reach the renderer.
   */
  broadcastToUi(channel: string, payload: unknown): void {
    const sent = new Set<number>()
    const sendTo = (webContents: Electron.WebContents | undefined): void => {
      if (!webContents || webContents.isDestroyed() || sent.has(webContents.id)) {
        return
      }
      sent.add(webContents.id)
      webContents.send(channel, payload)
    }

    sendTo(this.tabBarView?.webContents)
    sendTo(this.webDashboardView?.webContents)
    sendTo(this.mainWindow.webContents)
  }

  forwardToToastOverlay(channel: string, payload: unknown): void {
    void this.ensureToastOverlay()
    this.sendToToastOverlay(channel, payload)
  }

  private sendPublishEvent(
    channel: 'multipost:publish:progress' | 'multipost:publish:complete' | 'multipost:publish:error',
    payload: PublishEventPayload
  ): void {
    this.broadcastToUi(channel, payload)
  }

  private toWebPublishStatus(status: PublishTargetStatus): PublishEventStatus {
    switch (status) {
      case 'pending':
        return 'pending'
      case 'filling':
      case 'ready':
        return 'processing'
      case 'success':
        return 'completed'
      case 'failed':
        return 'failed'
      case 'cancelled':
        return 'cancelled'
    }
  }

  private isTerminalTargetStatus(status: PublishTargetStatus): boolean {
    return status === 'success' || status === 'failed' || status === 'cancelled'
  }

  private buildPublishEventPayload(params: {
    groupId?: string
    taskId?: string
    contentType: SyncContentType
    target: Pick<
      PublishTargetResult,
      'platform' | 'accountId' | 'status' | 'error' | 'postUrl' | 'extensionKey'
    >
  }): PublishEventPayload {
    return {
      groupId: params.groupId,
      taskId: params.taskId,
      platform: params.target.platform,
      accountId: params.target.accountId,
      contentType: params.contentType,
      status: this.toWebPublishStatus(params.target.status),
      error: params.target.error,
      postUrl: params.target.postUrl,
      extensionKey: params.target.extensionKey
    }
  }

  private emitPublishErrorOnce(payload: PublishEventPayload): void {
    const runId = payload.taskId ?? payload.groupId
    const errorKey = `${runId ?? 'unknown'}:${payload.accountId}:error`
    if (this.emittedPublishErrorKeys.has(errorKey)) {
      return
    }
    this.emittedPublishErrorKeys.add(errorKey)
    this.sendPublishEvent('multipost:publish:error', payload)
  }

  private emitPublishCompleteOnce(runId: string, payload: PublishEventPayload): void {
    if (this.finalizedPublishRunIds.has(runId)) {
      return
    }
    this.finalizedPublishRunIds.add(runId)
    this.sendPublishEvent('multipost:publish:complete', payload)
  }

  private getPublishHistoryTargetKey(runId: string, accountId: string): string {
    return `${runId}:${accountId}`
  }

  private getPublishHistoryKey(runId: string, accountId: string, attempt: number): string {
    return `${this.getPublishHistoryTargetKey(runId, accountId)}:${attempt}`
  }

  private getPublishHistoryAttempt(runId: string, accountId: string): number {
    return this.publishHistoryAttemptByTarget.get(
      this.getPublishHistoryTargetKey(runId, accountId)
    ) ?? 0
  }

  private startNewPublishHistoryAttempt(runId: string, accountId: string): void {
    const targetKey = this.getPublishHistoryTargetKey(runId, accountId)
    const nextAttempt = (this.publishHistoryAttemptByTarget.get(targetKey) ?? 0) + 1
    this.publishHistoryAttemptByTarget.set(targetKey, nextAttempt)
    this.persistedPublishHistoryKeys.delete(
      this.getPublishHistoryKey(runId, accountId, nextAttempt)
    )
  }

  private clearPublishHistoryMarkers(runId: string): void {
    const prefix = `${runId}:`
    for (const key of Array.from(this.publishHistoryAttemptByTarget.keys())) {
      if (key.startsWith(prefix)) {
        this.publishHistoryAttemptByTarget.delete(key)
      }
    }
    for (const key of Array.from(this.persistedPublishHistoryKeys)) {
      if (key.startsWith(prefix)) {
        this.persistedPublishHistoryKeys.delete(key)
      }
    }
  }

  private derivePublishHistoryContent(
    contentType: SyncContentType,
    data: unknown
  ): PublishHistoryContent {
    const coerceString = (value: unknown): string => {
      if (value === null || value === undefined) {
        return ''
      }
      try {
        return String(value)
      } catch {
        return ''
      }
    }
    const payload =
      data !== null && typeof data === 'object' ? (data as Record<string, unknown>) : null
    const read = (key: string): string => coerceString(payload?.[key])
    const primitiveContent = payload ? '' : coerceString(data)
    const contentKeys =
      contentType === 'ARTICLE'
        ? ['markdownContent', 'htmlContent', 'content', 'description', 'digest']
        : contentType === 'PODCAST'
          ? ['description', 'content', 'markdownContent', 'htmlContent', 'digest']
          : ['content', 'description', 'markdownContent', 'htmlContent', 'digest']
    const content =
      contentKeys.map(read).find((value) => value.trim().length > 0) ?? primitiveContent
    const firstContentLine = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0)
    const title = read('title').trim() || firstContentLine || '无标题'

    return {
      title,
      content
    }
  }

  private getPublishHistoryStatus(status: PublishTargetStatus): PublishHistory['status'] | null {
    if (status === 'success') {
      return 'success'
    }
    if (status === 'failed') {
      return 'failed'
    }
    return null
  }

  private writePublishHistoryForTargets(params: {
    runId: string
    contentType: SyncContentType
    historyContent: PublishHistoryContent
    targets: PublishHistoryTarget[]
  }): void {
    const db = DatabaseService.getInstance()

    for (const target of params.targets) {
      const status = this.getPublishHistoryStatus(target.status)
      if (!status) {
        continue
      }

      const attempt = this.getPublishHistoryAttempt(params.runId, target.accountId)
      const historyKey = this.getPublishHistoryKey(params.runId, target.accountId, attempt)
      if (this.persistedPublishHistoryKeys.has(historyKey)) {
        continue
      }

      if (!db.getAccount(target.accountId)) {
        continue
      }

      const now = Date.now()
      const history: PublishHistory = {
        id: uuidv4(),
        contentType: params.contentType,
        title: params.historyContent.title,
        content: params.historyContent.content,
        platform: target.platform,
        accountId: target.accountId,
        status,
        errorMessage: target.error,
        platformPostUrl: target.postUrl,
        publishedAt: now,
        createdAt: now
      }

      try {
        db.createPublishHistory(history)
        this.persistedPublishHistoryKeys.add(historyKey)
      } catch (error) {
        publishLogger.error(
          `Failed to write publish history for ${params.runId}/${target.accountId}:`,
          error
        )
      }
    }
  }

  private buildGroupTargetResult(
    target: PublishGroupView['views'] extends Map<string, infer T> ? T : never
  ): PublishTargetResult {
    return {
      platform: target.platform,
      accountId: target.accountId,
      status: target.status,
      error: target.error,
      postUrl: target.postUrl,
      extensionKey: target.extensionKey
    }
  }

  private buildGroupStatusSnapshot(group: PublishGroupView): PublishStatusSnapshot {
    return {
      taskId: group.id,
      groupId: group.id,
      contentType: group.contentType,
      status: group.status,
      targets: Array.from(group.views.values()).map((target) => this.buildGroupTargetResult(target)),
      updatedAt: Date.now()
    }
  }

  private buildExecutorStatusSnapshot(run: ExecutorPublishRun): PublishStatusSnapshot {
    return {
      taskId: run.id,
      contentType: run.contentType,
      status: run.status,
      targets: Array.from(run.targets.values()).map((target) => ({
        platform: target.platform,
        accountId: target.accountId,
        status: target.status,
        error: target.error,
        postUrl: target.postUrl,
        extensionKey: target.extensionKey
      })),
      updatedAt: run.updatedAt
    }
  }

  private rememberPublishSnapshot(snapshot: PublishStatusSnapshot): void {
    this.prunePublishSnapshots()
    if (this.publishStatusSnapshots.has(snapshot.taskId)) {
      this.publishStatusSnapshots.delete(snapshot.taskId)
    }
    this.publishStatusSnapshots.set(snapshot.taskId, snapshot)
    while (this.publishStatusSnapshots.size > PUBLISH_SNAPSHOT_LIMIT) {
      const oldestKey = this.publishStatusSnapshots.keys().next().value
      if (oldestKey === undefined) break
      this.publishStatusSnapshots.delete(oldestKey)
    }
  }

  private prunePublishSnapshots(): void {
    const oldestKeptAt = Date.now() - PUBLISH_SNAPSHOT_TTL_MS
    for (const [taskId, snapshot] of this.publishStatusSnapshots) {
      if (snapshot.updatedAt < oldestKeptAt) {
        this.publishStatusSnapshots.delete(taskId)
      }
    }
  }

  private clearRunMarkers(taskId: string): void {
    this.cancelledPublishIds.delete(taskId)
    this.finalizedPublishRunIds.delete(taskId)
    this.notifiedGroupIds.delete(taskId)
    this.summaryEmittedGroupIds.delete(taskId)
    for (const key of Array.from(this.emittedPublishErrorKeys)) {
      if (key.startsWith(`${taskId}:`)) {
        this.emittedPublishErrorKeys.delete(key)
      }
    }
    this.clearPublishHistoryMarkers(taskId)
  }

  private statusSnapshotToWebStatus(snapshot: PublishStatusSnapshot): PublishStatus {
    if (snapshot.status === 'idle') {
      return 'idle'
    }
    if (snapshot.status === 'cancelled') {
      return 'cancelled'
    }
    if (snapshot.status === 'failed') {
      return 'failed'
    }
    if (snapshot.status === 'completed') {
      return 'completed'
    }

    const statuses = snapshot.targets.map((target) => target.status)
    if (statuses.length === 0) {
      return snapshot.status === 'preparing' ? 'pending' : 'processing'
    }
    if (statuses.some((status) => status === 'cancelled')) {
      return 'cancelled'
    }
    if (statuses.some((status) => status === 'failed')) {
      return 'failed'
    }
    if (statuses.every((status) => status === 'success')) {
      return 'completed'
    }
    if (statuses.every((status) => status === 'pending')) {
      return 'pending'
    }
    return 'processing'
  }

  private setGroupTargetStatus(
    groupId: string,
    accountId: string,
    status: PublishTargetStatus,
    details: { error?: string; postUrl?: string; extensionKey?: string } = {}
  ): void {
    const group = this.publishGroups.get(groupId)
    if (!group) return

    const target = group.views.get(accountId)
    if (!target) return

    const previousStatus = target.status
    target.status = status
    if (details.error !== undefined) target.error = details.error
    if (details.postUrl !== undefined) target.postUrl = details.postUrl
    if (details.extensionKey !== undefined) target.extensionKey = details.extensionKey
    if (this.isTerminalTargetStatus(status) || status === 'ready') {
      target.currentStep = undefined
    }
    if (this.isTerminalTargetStatus(previousStatus) && !this.isTerminalTargetStatus(status)) {
      this.startNewPublishHistoryAttempt(groupId, accountId)
      // Rolling a terminal target back (retry / fill-all) starts a fresh attempt:
      // drop the prior attempt's result metadata so the next terminal write records
      // clean error/postUrl for this attempt instead of leaking stale values.
      if (details.error === undefined) target.error = undefined
      if (details.postUrl === undefined) target.postUrl = undefined
      if (details.extensionKey === undefined) target.extensionKey = undefined
    }
    if (this.getPublishHistoryStatus(status)) {
      this.writePublishHistoryForTargets({
        runId: group.id,
        contentType: group.contentType,
        historyContent: this.derivePublishHistoryContent(group.contentType, group.data),
        targets: [target]
      })
    }

    this.updateGroupStatus(groupId)
    this.notifyGroupTabsChanged(groupId)
    this.rememberPublishSnapshot(this.buildGroupStatusSnapshot(group))

    if (previousStatus !== status) {
      const payload = this.buildPublishEventPayload({
        groupId,
        contentType: group.contentType,
        target
      })
      this.sendPublishEvent('multipost:publish:progress', payload)
      if (status === 'failed') {
        this.emitPublishErrorOnce(payload)
      }
    }
  }

  /** Surface the currently executing step in the progress UI (no status change). */
  private setGroupTargetStep(groupId: string, accountId: string, step?: string): void {
    const group = this.publishGroups.get(groupId)
    const target = group?.views.get(accountId)
    if (!group || !target) return
    target.currentStep = step
    this.notifyGroupTabsChanged(groupId)
  }

  private emitGroupRunFinished(groupId: string): void {
    const group = this.publishGroups.get(groupId)
    if (!group) return

    const targets = Array.from(group.views.values())
    const snapshot = this.buildGroupStatusSnapshot(group)
    this.rememberPublishSnapshot(snapshot)

    const isFinished =
      targets.length > 0 && targets.every((target) => this.isTerminalTargetStatus(target.status))
    if (!isFinished) {
      return
    }

    this.notifyGroupRunFinishedOnce(group, targets)
    this.broadcastGroupSummaryOnce(group, targets)

    if (!targets.every((target) => target.status === 'success')) {
      return
    }

    const target = targets[0]
    this.emitPublishCompleteOnce(
      groupId,
      this.buildPublishEventPayload({
        groupId,
        contentType: group.contentType,
        target
      })
    )
  }

  /**
   * One run summary per group lifecycle (retry clears the marker): every
   * target's final status/error/postUrl, so the publish page can render a
   * "what actually happened" report once everything is terminal.
   */
  private broadcastGroupSummaryOnce(
    group: PublishGroupView,
    targets: Array<PublishGroupView['views'] extends Map<string, infer T> ? T : never>
  ): void {
    if (this.summaryEmittedGroupIds.has(group.id)) return
    this.summaryEmittedGroupIds.add(group.id)

    const summary: PublishGroupSummary = {
      groupId: group.id,
      groupName: group.name,
      contentType: group.contentType,
      finishedAt: Date.now(),
      targets: targets.map((target) => ({
        accountId: target.accountId,
        platform: target.platform,
        displayName: target.displayName,
        status: target.status,
        error: target.error,
        postUrl: target.postUrl
      }))
    }
    this.broadcastToUi('multipost:publish:groupSummary', summary)
  }

  private notifyGroupRunFinishedOnce(
    group: PublishGroupView,
    targets: Array<PublishGroupView['views'] extends Map<string, infer T> ? T : never>
  ): void {
    if (this.notifiedGroupIds.has(group.id) || !Notification.isSupported()) {
      return
    }
    if (this.mainWindow.isDestroyed() || this.mainWindow.isFocused()) {
      return
    }

    const successCount = targets.filter((target) => target.status === 'success').length
    const failedCount = targets.filter((target) => target.status === 'failed').length
    const cancelledCount = targets.filter((target) => target.status === 'cancelled').length

    if (cancelledCount === targets.length) {
      return
    }
    if (failedCount === 0 && successCount !== targets.length) {
      return
    }

    const notification =
      failedCount > 0
        ? new Notification({
            title: '发布部分失败',
            body: `成功 ${successCount} / 失败 ${failedCount}`
          })
        : new Notification({
            title: '发布完成',
            body: `「${group.name}」已发布到 ${successCount} 个平台`
          })

    this.notifiedGroupIds.add(group.id)
    notification.on('click', () => {
      if (this.mainWindow.isDestroyed()) {
        return
      }
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore()
      }
      this.mainWindow.show()
      this.mainWindow.focus()
    })
    notification.show()
  }

  beginExecutorPublishRun(params: {
    contentType: SyncContentType
    data: SyncContentData
    targets: Array<{ accountId: string; platform: PlatformType }>
  }): string {
    const taskId = `executor-${uuidv4()}`
    const targets = new Map<string, ExecutorPublishTargetState>()
    for (const target of params.targets) {
      targets.set(target.accountId, {
        accountId: target.accountId,
        platform: target.platform,
        contentType: params.contentType,
        status: 'pending'
      })
    }

    const run: ExecutorPublishRun = {
      id: taskId,
      contentType: params.contentType,
      historyContent: this.derivePublishHistoryContent(params.contentType, params.data),
      status: 'preparing',
      targets,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      cancelled: false
    }
    this.executorPublishRuns.set(taskId, run)
    this.rememberPublishSnapshot(this.buildExecutorStatusSnapshot(run))

    for (const target of run.targets.values()) {
      this.sendPublishEvent('multipost:publish:progress', this.buildPublishEventPayload({
        taskId,
        contentType: target.contentType,
        target
      }))
    }

    return taskId
  }

  private updateExecutorRunStatus(run: ExecutorPublishRun): void {
    const statuses = Array.from(run.targets.values()).map((target) => target.status)
    if (run.cancelled || statuses.every((status) => status === 'cancelled')) {
      run.status = 'cancelled'
    } else if (statuses.some((status) => status === 'failed')) {
      run.status = statuses.every((status) => this.isTerminalTargetStatus(status)) ? 'failed' : 'publishing'
    } else if (statuses.every((status) => status === 'success')) {
      run.status = 'completed'
    } else if (statuses.some((status) => status === 'filling' || status === 'ready')) {
      run.status = 'publishing'
    } else {
      run.status = 'preparing'
    }
    run.updatedAt = Date.now()
    this.rememberPublishSnapshot(this.buildExecutorStatusSnapshot(run))
  }

  private setExecutorTargetStatus(
    taskId: string | undefined,
    accountId: string,
    status: PublishTargetStatus,
    details: { error?: string; postUrl?: string; extensionKey?: string } = {}
  ): void {
    if (!taskId) return
    const run = this.executorPublishRuns.get(taskId)
    const target = run?.targets.get(accountId)
    if (!run || !target) return

    const previousStatus = target.status
    target.status = status
    if (details.error !== undefined) target.error = details.error
    if (details.postUrl !== undefined) target.postUrl = details.postUrl
    if (details.extensionKey !== undefined) target.extensionKey = details.extensionKey
    if (this.isTerminalTargetStatus(previousStatus) && !this.isTerminalTargetStatus(status)) {
      this.startNewPublishHistoryAttempt(taskId, accountId)
      // See setGroupTargetStatus: reset stale per-attempt result on rollover so the
      // next terminal write does not inherit the previous attempt's error/postUrl.
      if (details.error === undefined) target.error = undefined
      if (details.postUrl === undefined) target.postUrl = undefined
      if (details.extensionKey === undefined) target.extensionKey = undefined
    }
    if (this.getPublishHistoryStatus(status)) {
      this.writePublishHistoryForTargets({
        runId: run.id,
        contentType: run.contentType,
        historyContent: run.historyContent,
        targets: [target]
      })
    }
    this.updateExecutorRunStatus(run)

    if (previousStatus !== status) {
      const payload = this.buildPublishEventPayload({
        taskId,
        contentType: target.contentType,
        target
      })
      this.sendPublishEvent('multipost:publish:progress', payload)
      if (status === 'failed') {
        this.emitPublishErrorOnce(payload)
      }
    }
  }

  finishExecutorPublishRun(taskId: string): PublishStatusSnapshot {
    const run = this.executorPublishRuns.get(taskId)
    if (!run) {
      return this.getPublishStatus(taskId)
    }

    this.updateExecutorRunStatus(run)
    const snapshot = this.buildExecutorStatusSnapshot(run)
    const targets = Array.from(run.targets.values())

    if (snapshot.status === 'completed' && targets.length > 0) {
      this.emitPublishCompleteOnce(
        taskId,
        this.buildPublishEventPayload({
          taskId,
          contentType: run.contentType,
          target: targets[0]
        })
      )
    }

    this.rememberPublishSnapshot(snapshot)
    this.executorPublishRuns.delete(taskId)
    this.clearRunMarkers(taskId)
    return snapshot
  }

  isPublishCancelled(taskId: string): boolean {
    return (
      this.cancelledPublishIds.has(taskId) ||
      this.executorPublishRuns.get(taskId)?.cancelled === true ||
      this.publishGroups.get(taskId)?.status === 'cancelled' ||
      this.publishStatusSnapshots.get(taskId)?.status === 'cancelled'
    )
  }

  private isExecutorPublishCancelled(taskId?: string): boolean {
    return taskId !== undefined && (
      this.cancelledPublishIds.has(taskId) ||
      this.executorPublishRuns.get(taskId)?.cancelled === true
    )
  }

  markExecutorPublishTargetFailed(taskId: string, accountId: string, error: unknown): void {
    if (this.isPublishCancelled(taskId)) {
      this.setExecutorTargetStatus(taskId, accountId, 'cancelled')
      return
    }
    this.setExecutorTargetStatus(taskId, accountId, 'failed', {
      error: this.formatPublishError(error)
    })
  }

  getPublishStatus(taskId: string): PublishStatusSnapshot {
    this.prunePublishSnapshots()

    const group = this.publishGroups.get(taskId)
    if (group) {
      const snapshot = this.buildGroupStatusSnapshot(group)
      this.rememberPublishSnapshot(snapshot)
      return snapshot
    }

    const executorRun = this.executorPublishRuns.get(taskId)
    if (executorRun) {
      const snapshot = this.buildExecutorStatusSnapshot(executorRun)
      this.rememberPublishSnapshot(snapshot)
      return snapshot
    }

    return (
      this.publishStatusSnapshots.get(taskId) ?? {
        taskId,
        status: 'idle',
        targets: [],
        updatedAt: Date.now()
      }
    )
  }

  getWebPublishStatus(taskId: string): PublishStatus {
    return this.statusSnapshotToWebStatus(this.getPublishStatus(taskId))
  }

  async cancelPublish(taskId: string): Promise<PublishStatusSnapshot> {
    const group = this.publishGroups.get(taskId)
    if (group) {
      return this.cancelPublishGroup(taskId, group)
    }

    const executorRun = this.executorPublishRuns.get(taskId)
    if (executorRun) {
      return this.cancelExecutorPublishRun(taskId, executorRun)
    }

    if (this.executorViews.has(taskId)) {
      const executor = this.executorViews.get(taskId)!
      await this.closeExecutorView(taskId)
      const snapshot: PublishStatusSnapshot = {
        taskId,
        status: 'cancelled',
        targets: [
          {
            platform: executor.platform,
            accountId: executor.accountId,
            status: 'cancelled'
          }
        ],
        updatedAt: Date.now()
      }
      this.rememberPublishSnapshot(snapshot)
      return snapshot
    }

    return this.getPublishStatus(taskId)
  }

  private async cancelPublishGroup(
    groupId: string,
    group: PublishGroupView
  ): Promise<PublishStatusSnapshot> {
    this.cancelledPublishIds.add(groupId)

    for (const target of group.views.values()) {
      if (target.status !== 'success' && target.status !== 'failed') {
        this.setGroupTargetStatus(groupId, target.accountId, 'cancelled')
      }
    }

    this.updateGroupStatus(groupId)
    const snapshot = this.buildGroupStatusSnapshot(group)
    this.rememberPublishSnapshot(snapshot)
    this.emitGroupRunFinished(groupId)

    for (const target of group.views.values()) {
      if (target.isVisible) {
        this.mainWindow.contentView.removeChildView(target.view)
        target.isVisible = false
      }
      if (!target.view.webContents.isDestroyed()) {
        await releaseAccountProxyForWebContents(target.view.webContents)
        target.view.webContents.close()
      }
    }

    this.publishGroups.delete(groupId)
    this.clearRunMarkers(groupId)
    if (this.activeGroupId === groupId) {
      this.activeGroupId = null
      await this.switchToHome()
    } else {
      this.notifyTabsChanged()
    }

    return snapshot
  }

  private async cancelExecutorPublishRun(
    taskId: string,
    run: ExecutorPublishRun
  ): Promise<PublishStatusSnapshot> {
    this.cancelledPublishIds.add(taskId)
    run.cancelled = true

    for (const target of run.targets.values()) {
      if (target.status !== 'success' && target.status !== 'failed') {
        this.setExecutorTargetStatus(taskId, target.accountId, 'cancelled')
      }
    }

    for (const target of run.targets.values()) {
      await this.closeExecutorView(target.accountId)
    }

    const snapshot = this.finishExecutorPublishRun(taskId)
    this.rememberPublishSnapshot(snapshot)
    return snapshot
  }

  /**
   * Initialize the native home tab (renderer UI) and tab bar.
   * Called after main window is ready. The web dashboard is NOT loaded here;
   * it is created lazily by ensureWebDashboardView() when the user opens it.
   */
  async initializeHomeTab(): Promise<void> {
    if (this.tabBarView) return

    const [width, height] = this.mainWindow.getContentSize()

    // The renderer view doubles as browser chrome and native home UI: it
    // covers the whole window while the home tab is active and shrinks to
    // the tab strip when a content WebContentsView is shown.
    this.tabBarView = new WebContentsView({
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        // The chrome/home UI must keep animating while the window is occluded;
        // otherwise intro animations stall at their first frame and snap when
        // the window becomes visible again.
        backgroundThrottling: false
      }
    })
    this.installNavigationGuard(this.tabBarView.webContents, 'tabbar')
    // window.open from the native UI (e.g. "查看链接" on publish results) must
    // land in the system browser, never in an unmanaged BrowserWindow.
    this.tabBarView.webContents.setWindowOpenHandler(({ url }) => {
      void openExternalUrl(url)
      return { action: 'deny' }
    })
    this.tabBarView.setBounds({
      x: 0,
      y: 0,
      width: width,
      height: height
    })
    this.mainWindow.contentView.addChildView(this.tabBarView)

    // Load tab bar renderer
    const isDev = !!(process.env.ELECTRON_RENDERER_URL)
    if (isDev) {
      await this.tabBarView.webContents.loadURL(process.env.ELECTRON_RENDERER_URL!)
    } else {
      await this.tabBarView.webContents.loadFile(join(__dirname, '../renderer/index.html'))
    }
    this.debugAttachConsoleCapture(this.tabBarView.webContents, 'tabbar')
    publishLogger.info('Tab bar view created')

    // Set native home as active
    this.activeViewId = HOME_TAB_ID
    this.notifyTabsChanged()

    // Setup IPC handlers for web dashboard navigation
    this.setupWebDashboardIpcHandlers()

    // Global toast overlay: register IPC + create the transparent view so every
    // renderer's toasts float above all content views.
    this.setupToastOverlayIpc()
    void this.ensureToastOverlay()

    publishLogger.info('Native home tab initialized')
  }

  /**
   * Create the web dashboard WebContentsView on first use.
   */
  private async ensureWebDashboardView(): Promise<WebContentsView> {
    if (this.webDashboardView) return this.webDashboardView

    const [width, height] = this.mainWindow.getContentSize()

    // Account stats are included in account list/get responses, including the
    // web dashboard; P0 adds no dedicated live stats push event for web.
    const view = new WebContentsView({
      webPreferences: {
        preload: join(__dirname, '../preload/webview.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        webSecurity: true
      }
    })
    this.webDashboardView = view
    this.installNavigationGuard(view.webContents, 'web-dashboard')
    view.setBounds({
      x: 0,
      y: TABBAR_HEIGHT,
      width: width,
      height: height - TABBAR_HEIGHT
    })

    // Handle new window requests (e.g. auth callback, target="_blank" links)
    // Keep same-origin navigation inside the view, open external links in system browser
    const allowedHosts = ['multipost.app', 'localhost']
    view.webContents.setWindowOpenHandler(({ url }) => {
      try {
        const urlObj = new URL(url)
        const isSameOrigin = allowedHosts.some(
          (host) => urlObj.hostname === host || urlObj.hostname.endsWith(`.${host}`)
        )
        if (isSameOrigin) {
          void this.loadURLWithNavigationHandling(
            view.webContents,
            url,
            'web-dashboard:window-open'
          ).catch((error: unknown) => {
            publishLogger.error('Web dashboard window-open navigation failed:', error)
          })
          return { action: 'deny' }
        }
      } catch {
        // invalid URL
      }
      void openExternalUrl(url)
      return { action: 'deny' }
    })

    view.webContents.on('page-title-updated', () => {
      this.notifyTabsChanged()
    })
    view.webContents.on('did-navigate', () => {
      this.notifyTabsChanged()
    })
    view.webContents.on('did-navigate-in-page', () => {
      this.notifyTabsChanged()
    })

    this.debugAttachConsoleCapture(view.webContents, 'web-dashboard')

    const homeUrl = `${WEB_DASHBOARD_BASE_URL}/dashboard`
    publishLogger.info('Loading web dashboard:', homeUrl)
    // A failed load (offline, dev server down) must not abort tab activation;
    // the view shows Chromium's error page and the user can reload.
    await view.webContents.loadURL(homeUrl).catch((error) => {
      publishLogger.error('Web dashboard load failed:', error)
    })

    return view
  }

  /**
   * Show the web dashboard tab, creating the view on first use.
   */
  async openWebDashboard(path?: string): Promise<void> {
    const view = await this.ensureWebDashboardView()

    if (path) {
      const fullPath = path.startsWith('/dashboard') ? path : `/dashboard${path}`
      const url = `${WEB_DASHBOARD_BASE_URL}${fullPath}`
      if (!this.blockUnsupportedNavigation(url, 'web-dashboard:navigateTo')) {
        view.webContents.loadURL(url).catch((error) => {
          publishLogger.error('Web dashboard navigation failed:', error)
        })
      }
    }

    // Hide account, publish group, platform and executor views
    for (const managed of this.views.values()) {
      if (managed.isVisible) {
        this.mainWindow.contentView.removeChildView(managed.view)
        managed.isVisible = false
      }
    }
    this.hideAllGroupViews()
    this.hideAuxiliarySurfaces()

    this.mainWindow.contentView.addChildView(view)
    if (this.tabBarView) {
      this.raiseTopSurfaces()
    }

    this.activeViewId = WEB_TAB_ID
    this.activeGroupId = null
    this.updateAllViewBounds()
    this.notifyTabsChanged()
  }

  /**
   * Close the web dashboard tab and destroy its view.
   */
  private closeWebDashboard(): void {
    if (!this.webDashboardView) return

    const wasActive = this.activeViewId === WEB_TAB_ID
    this.mainWindow.contentView.removeChildView(this.webDashboardView)
    const webContents = this.webDashboardView.webContents as Electron.WebContents & {
      destroy?: () => void
    }
    webContents.destroy?.()
    this.webDashboardView = null

    if (wasActive) {
      void this.switchToHome()
    } else {
      this.notifyTabsChanged()
    }
  }

  /**
   * Hide simple-mode platform views and executor views. These are auxiliary
   * surfaces that must never stay visible when switching to a top-level tab
   * (native home, web dashboard, account view, publish group).
   */
  private hideAuxiliarySurfaces(): void {
    // Only detach from the window: the webContents keep running so in-flight
    // fill/submit automation in these views continues in the background, and
    // the active IDs stay intact so publish flows can re-show their view.
    for (const managed of this.platformViews.values()) {
      if (managed.isVisible) {
        this.mainWindow.contentView.removeChildView(managed.view)
        managed.isVisible = false
      }
    }
    for (const managed of this.executorViews.values()) {
      if (managed.isVisible) {
        this.mainWindow.contentView.removeChildView(managed.view)
        managed.isVisible = false
      }
    }
  }

  /**
   * Hide all publish group views.
   */
  private hideAllGroupViews(): void {
    for (const group of this.publishGroups.values()) {
      for (const target of group.views.values()) {
        if (target.isVisible) {
          this.mainWindow.contentView.removeChildView(target.view)
          target.isVisible = false
        }
      }
    }
  }

  /**
   * True when the native home tab is the active surface, meaning the renderer
   * view should cover the whole window instead of just the tab strip.
   */
  private isNativeHomeActive(): boolean {
    // activeViewId null happens in transitional states (e.g. after hiding all
    // platform views); with no visible content view the native home is the
    // surface the user sees, so the chrome should stay expanded.
    const noActiveContent = this.activeViewId === HOME_TAB_ID || this.activeViewId === null
    return noActiveContent && !this.activeGroupId && !this.hasVisibleView()
  }

  /**
   * Setup IPC handlers for the web dashboard tab (navigation, file dialogs, etc.)
   */
  private setupWebDashboardIpcHandlers(): void {
    // 导航请求 - 打开/导航 web 工作台 tab（懒创建）
    ipcMain.on('multipost:navigation:navigateTo', (_, path: string) => {
      void this.openWebDashboard(path)
    })

    // 导航报告
    ipcMain.on('multipost:navigation:reportPath', (_, path: string) => {
      this.mainWindow.webContents.send('webview:path-changed', path)
    })

    // 显示/隐藏 web 工作台
    ipcMain.on('multipost:webview:show', () => {
      void this.openWebDashboard()
    })

    ipcMain.on('multipost:webview:hide', () => {
      if (this.activeViewId === WEB_TAB_ID) {
        void this.switchToHome()
      } else if (this.webDashboardView) {
        this.mainWindow.contentView.removeChildView(this.webDashboardView)
      }
    })

    // 打开外部链接
    ipcMain.handle('multipost:app:openExternal', async (_, url: string) => {
      await openExternalUrl(url)
    })

    // 选择文件
    ipcMain.handle(
      'multipost:app:selectFile',
      async (
        _,
        options?: { filters?: { name: string; extensions: string[] }[]; multiple?: boolean }
      ) => {
        const result = await dialog.showOpenDialog(this.mainWindow, {
          properties: options?.multiple ? ['openFile', 'multiSelections'] : ['openFile'],
          filters: options?.filters
        })
        return result.filePaths
      }
    )

    // 选择目录
    ipcMain.handle('multipost:app:selectDirectory', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow, {
        properties: ['openDirectory']
      })
      return result.filePaths[0] || null
    })

    // 获取窗口尺寸
    ipcMain.handle('multipost:layout:getWindowSize', () => {
      const [width, height] = this.mainWindow.getSize()
      return { width, height }
    })

    // 窗口控制
    ipcMain.handle('multipost:layout:minimize', () => {
      this.mainWindow.minimize()
    })

    ipcMain.handle('multipost:layout:maximize', () => {
      if (this.mainWindow.isMaximized()) {
        this.mainWindow.unmaximize()
      } else {
        this.mainWindow.maximize()
      }
    })

    ipcMain.handle('multipost:layout:close', () => {
      this.mainWindow.close()
    })

    // 设置默认账号
    ipcMain.handle('multipost:account:setDefault', async (_, id: string) => {
      const account = await DatabaseService.getInstance().getAccount(id)
      if (account) {
        await DatabaseService.getInstance().setDefaultAccount(id, account.platform)
      }
    })
  }

  /**
   * Get the home view
   */
  getWebDashboardView(): WebContentsView | null {
    return this.webDashboardView
  }

  /**
   * Set the sidebar width and update all view bounds
   */
  setSidebarWidth(width: number): void {
    this.sidebarWidth = width
    this.updateAllViewBounds()
  }

  /**
   * Get current sidebar width
   */
  getSidebarWidth(): number {
    return this.sidebarWidth
  }

  /**
   * Create or get a WebContentsView for an account
   */
  async openView(accountId: string, platform: PlatformType, url?: string): Promise<WebContentsView> {
    publishLogger.info('openView called:', { accountId, platform, url })
    const account = DatabaseService.getInstance().getAccount(accountId)

    // Check if view already exists
    const existing = this.views.get(accountId)
    if (existing) {
      publishLogger.info('View exists, showing it')
      await this.showView(accountId)
      if (url) {
        await this.navigate(accountId, url)
      } else {
        await applyAccountProxy(existing.view.webContents.session, account)
      }
      return existing.view
    }

    publishLogger.info('Creating new view')
    // Get session partition from account database for session isolation
    // This ensures login state is preserved across different features
    const partition = account?.sessionPartition || `persist:account-${accountId}`
    publishLogger.info('Using session partition:', partition)
    const ses = session.fromPartition(partition)
    hardenSession(ses)
    await applyAccountProxy(ses, account)

    // Create WebContentsView with isolated session
    const view = new WebContentsView({
      webPreferences: createThirdPartyContentWebPreferences(ses)
    })
    this.installNavigationGuard(view.webContents, `account:${accountId}`)

    // Set bounds (full width, only reserve space for tab bar)
    // MainWebView is hidden when WebContentsView is shown, so no sidebar offset needed
    // Use getContentSize() instead of getBounds() for correct dimensions
    const [width, height] = this.mainWindow.getContentSize()
    const topOffset = TABBAR_HEIGHT
    publishLogger.info('Setting bounds:', { x: 0, y: topOffset, width, height: height - topOffset })
    view.setBounds({
      x: 0,
      y: topOffset,
      width: width,
      height: height - topOffset
    })
    // Disable auto-resize, we manage bounds manually via resize listener
    publishLogger.info('View created with bounds offset y:', topOffset)
    this.installThirdPartyWindowOpenHandler(view, ses)
    trackAccountProxyForWebContents(view.webContents)

    // Store the managed view
    const targetUrl = url || PLATFORMS[platform]?.url || 'about:blank'
    this.views.set(accountId, {
      view,
      accountId,
      platform,
      isVisible: true,
      title: PLATFORMS[platform]?.name || platform,
      url: targetUrl,
      isHome: false // isHome is only for the virtual home tab
    })

    // Hide home view when showing other WebContentsView
    if (this.webDashboardView) {
      this.mainWindow.contentView.removeChildView(this.webDashboardView)
    }

    // Hide all other content views (the freshly registered one stays visible)
    for (const [id, managed] of this.views) {
      if (id !== accountId && managed.isVisible) {
        this.mainWindow.contentView.removeChildView(managed.view)
        managed.isVisible = false
      }
    }

    // Add new view to window
    this.mainWindow.contentView.addChildView(view)
    publishLogger.info('Added new WebContentsView')

    // Ensure tab bar stays on top
    if (this.tabBarView) {
      this.raiseTopSurfaces()
    }

    // Hide other views
    this.hideAllExcept(accountId)
    this.activeViewId = accountId

    // Shrink the renderer view back to the tab strip if we left native home
    this.updateAllViewBounds()

    // Navigate to URL
    publishLogger.info('Loading URL:', targetUrl)
    const loadResult = await this.loadURLWithNavigationHandling(
      view.webContents,
      targetUrl,
      `account:${accountId}:open`
    )
    if (loadResult.ok) {
      publishLogger.info('URL loaded successfully')
    }

    // Listen for navigation events
    view.webContents.on('did-navigate', (_event, navigatedUrl) => {
      const managed = this.views.get(accountId)
      if (managed) {
        managed.url = navigatedUrl
      }
      this.mainWindow.webContents.send('browser:navigated', {
        accountId,
        url: navigatedUrl
      })
      // Notify tabs changed
      this.notifyTabsChanged()
    })

    view.webContents.on('did-navigate-in-page', (_event, navigatedUrl) => {
      const managed = this.views.get(accountId)
      if (managed) {
        managed.url = navigatedUrl
      }
      this.mainWindow.webContents.send('browser:navigated', {
        accountId,
        url: navigatedUrl
      })
      this.notifyTabsChanged()
    })

    view.webContents.on('page-title-updated', (_event, title) => {
      const managed = this.views.get(accountId)
      if (managed) {
        managed.title = title
      }
      this.mainWindow.webContents.send('browser:titleChanged', {
        accountId,
        title
      })
      // Notify tabs changed
      this.notifyTabsChanged()
    })

    // Notify UI immediately that a new tab was created
    this.notifyTabsChanged()
    publishLogger.info('Tabs changed notification sent')

    return view
  }

  /**
   * Close and remove a WebContentsView
   */
  async closeView(accountId: string): Promise<void> {
    const managed = this.views.get(accountId)
    if (!managed) return

    this.mainWindow.contentView.removeChildView(managed.view)
    // Destroy the webContents
    await releaseAccountProxyForWebContents(managed.view.webContents)
    managed.view.webContents.close()
    this.views.delete(accountId)

    const wasActive = this.activeViewId === accountId
    if (wasActive) {
      this.activeViewId = null
    }

    // If closed the active view, switch to home or another tab
    if (wasActive) {
      if (this.views.size > 0) {
        // Switch to first available tab
        const firstTabId = this.views.keys().next().value
        if (firstTabId) {
          await this.showView(firstTabId)
        }
      } else {
        // No more tabs, switch to home
        await this.switchToHome()
      }
    }
  }

  /**
   * Show a specific WebContentsView
   */
  async showView(accountId: string): Promise<void> {
    const managed = this.views.get(accountId)
    if (!managed) return

    // Hide web dashboard, platform and executor views
    if (this.webDashboardView) {
      this.mainWindow.contentView.removeChildView(this.webDashboardView)
    }
    this.hideAuxiliarySurfaces()

    this.hideAllExcept(accountId)
    this.mainWindow.contentView.addChildView(managed.view)
    managed.isVisible = true
    this.activeViewId = accountId

    // Ensure tab bar stays on top
    if (this.tabBarView) {
      this.raiseTopSurfaces()
    }

    // Shrink the renderer view back to the tab strip if we left native home
    this.updateAllViewBounds()

    this.notifyTabsChanged()
  }

  /**
   * Hide a specific WebContentsView
   */
  async hideView(accountId: string): Promise<void> {
    const managed = this.views.get(accountId)
    if (!managed) return

    this.mainWindow.contentView.removeChildView(managed.view)
    managed.isVisible = false

    if (this.activeViewId === accountId) {
      this.activeViewId = null
    }

    // Expand the renderer chrome again if this returns us to native home
    this.updateAllViewBounds()
  }

  /**
   * Hide all views except the specified one
   */
  private hideAllExcept(accountId: string): void {
    for (const [id, managed] of this.views) {
      if (id !== accountId && managed.isVisible) {
        this.mainWindow.contentView.removeChildView(managed.view)
        managed.isVisible = false
      }
    }
  }

  /**
   * Navigate to a URL
   */
  async navigate(accountId: string, url: string): Promise<void> {
    const managed = this.views.get(accountId)
    if (!managed) {
      throw new Error(`No view found for account: ${accountId}`)
    }
    const account = DatabaseService.getInstance().getAccount(accountId)
    const targetUrl = this.normalizeNavigationUrl(url)
    if (this.blockUnsupportedNavigation(targetUrl, `account:${accountId}:navigate`)) {
      return
    }
    await applyAccountProxy(managed.view.webContents.session, account)
    await this.loadURLWithNavigationHandling(
      managed.view.webContents,
      targetUrl,
      `account:${accountId}:navigate`
    )
  }

  async navigateTab(tabId: string, url: string): Promise<void> {
    const targetUrl = this.normalizeNavigationUrl(url)
    if (!targetUrl) {
      return
    }
    if (this.blockUnsupportedNavigation(targetUrl, `tab:${tabId}:navigate`)) {
      return
    }

    if (tabId === HOME_TAB_ID) {
      // Native home has no address bar target
      return
    }

    if (tabId === WEB_TAB_ID) {
      if (!this.webDashboardView) {
        throw new Error('Web dashboard view is not initialized')
      }
      await this.loadURLWithNavigationHandling(
        this.webDashboardView.webContents,
        targetUrl,
        'web-dashboard:address-bar'
      )
      this.notifyTabsChanged()
      return
    }

    const managed = this.views.get(tabId)
    if (managed) {
      await this.navigate(tabId, targetUrl)
      return
    }

    const group = this.publishGroups.get(tabId)
    const activeTarget = group?.activeAccountId ? group.views.get(group.activeAccountId) : null
    if (activeTarget) {
      await this.loadURLWithNavigationHandling(
        activeTarget.view.webContents,
        targetUrl,
        `publish-group:${tabId}:address-bar`
      )
      this.notifyTabsChanged()
      this.notifyGroupTabsChanged(tabId)
      return
    }

    throw new Error(`No tab found: ${tabId}`)
  }

  /**
   * Execute JavaScript in the WebContentsView
   */
  async executeScript<T = unknown>(accountId: string, script: string): Promise<T> {
    const managed = this.views.get(accountId)
    if (!managed) {
      throw new Error(`No view found for account: ${accountId}`)
    }
    return managed.view.webContents.executeJavaScript(script)
  }

  /**
   * Fetch user info from the platform via adapter's getUserInfo
   * Requires the WebContentsView to be open and loaded for the account
   */
  async fetchUserInfo(
    accountId: string,
    platform: PlatformType
  ): Promise<FetchedAccountUserInfo | null> {
    // Try using the open WebContentsView first (DOM scrapers can see more than
    // plain APIs on some platforms), but never let a flaky scraper block the
    // session-based fallback.
    const managed = this.views.get(accountId)
    if (managed) {
      const adapter = getAdapter(platform)
      if (adapter) {
        try {
          const result = await adapter.getUserInfo(managed.view)
          if (result) {
            return result
          }
        } catch (error) {
          publishLogger.error('adapter getUserInfo failed for', platform, error)
        }
      }
    }

    // Fallback: fetch user info directly from session cookies (no view needed)
    return this.fetchUserInfoFromSession(accountId, platform)
  }

  /**
   * Resolve the account's persisted session, including the legacy partition
   * fallback used by login-status checks, then apply browser hardening.
   */
  private async getAccountSession(
    accountId: string,
    platform: PlatformType
  ): Promise<{ account: Account | null; ses: Session }> {
    const account = DatabaseService.getInstance().getAccount(accountId)
    // Mirror getLoginStatus: accounts migrated from the legacy partition
    // format keep their cookies there, so fetch from whichever has them.
    const newPartition = account?.sessionPartition || `persist:account-${accountId}`
    let ses = session.fromPartition(newPartition)
    if ((await ses.cookies.get({})).length === 0) {
      ses = session.fromPartition(`persist:${platform}-${accountId}`)
    }
    hardenSession(ses)
    return { account, ses }
  }

  /**
   * Fetch user info directly using session cookies without needing a WebContentsView
   */
  private async fetchUserInfoFromSession(
    accountId: string,
    platform: PlatformType
  ): Promise<FetchedAccountUserInfo | null> {
    try {
      const { account, ses: targetSession } = await this.getAccountSession(accountId, platform)
      return await withAccountProxySession(targetSession, account, async () => {
        return fetchSessionUserInfo(targetSession, platform)
      })
    } catch (e) {
      publishLogger.error('fetchUserInfoFromSession error:', e)
      return null
    }
  }

  /**
   * Get login status by checking cookies from session partition
   * Works even when browser view is not open
   */
  async getLoginStatus(accountId: string, platform: PlatformType): Promise<boolean> {
    // Get session partition from database
    const account = DatabaseService.getInstance().getAccount(accountId)

    // Try both old and new partition formats
    const newPartition = account?.sessionPartition || `persist:account-${accountId}`
    const oldPartition = `persist:${platform}-${accountId}`

    // Check new partition first
    let ses = session.fromPartition(newPartition)
    let cookies = await ses.cookies.get({})

    // If no cookies in new partition, try old partition
    if (cookies.length === 0) {
      ses = session.fromPartition(oldPartition)
      cookies = await ses.cookies.get({})
    }

    // Platforms with a known signature cookie get an exact check
    const loginCookieRules = PLATFORM_LOGIN_COOKIES[platform]
    if (loginCookieRules) {
      return matchesLoginCookies(cookies, loginCookieRules)
    }

    // Platform-specific login detection
    switch (platform) {
      case 'qqmusic':
        // TODO(verify-login): confirm QQ音乐播客 real-login cookie/storage signals.
        return this.hasCookieForAnyDomain(cookies, ['tencentmusic.com'])
      case 'lizhi':
        // TODO(verify-login): confirm 荔枝播客 real-login cookie/storage signals.
        return this.hasCookieForAnyDomain(cookies, ['lizhi.fm'])
      case 'xiaoyuzhou':
        // TODO(verify-login): confirm 小宇宙播客 real-login cookie/storage signals.
        return this.hasCookieForAnyDomain(cookies, ['xiaoyuzhoufm.com'])
      case 'qingting':
        // TODO(verify-login): confirm 蜻蜓FM real-login cookie/storage signals.
        return this.hasCookieForAnyDomain(cookies, ['qingting.fm'])
      default:
        return cookies.length > 0
    }
  }

  async getAccountHealth(
    accountId: string,
    platform: PlatformType,
    isLoggedIn: boolean
  ): Promise<AccountHealthStatus> {
    const timestamp = Date.now()
    if (!isLoggedIn) {
      return { state: 'logged_out', updatedAt: timestamp }
    }

    switch (platform) {
      case 'xiaohongshu':
        try {
          const { account, ses: targetSession } = await this.getAccountSession(accountId, platform)
          const health = await withAccountProxySession(targetSession, account, async () => {
            return probeXiaohongshuHealth(targetSession)
          })
          if (health.state === 'unknown' && health.updatedAt === undefined) {
            return { ...health, updatedAt: Date.now() }
          }
          return { ...health, updatedAt: health.updatedAt ?? timestamp }
        } catch (error) {
          publishLogger.error(`getAccountHealth(${accountId}) probe failed:`, error)
          return { state: 'unknown', updatedAt: Date.now() }
        }
      default:
        return { state: 'active', updatedAt: timestamp }
    }
  }

  async getAccountAnalytics(
    accountId: string,
    platform: PlatformType
  ): Promise<AccountAnalytics | null> {
    if (!isAnalyticsSupported(platform)) return null

    try {
      const { account, ses: targetSession } = await this.getAccountSession(accountId, platform)
      return await withAccountProxySession(targetSession, account, async () => {
        return fetchAccountAnalytics(targetSession, platform)
      })
    } catch (error) {
      publishLogger.error(`getAccountAnalytics(${accountId}) failed:`, error)
      return null
    }
  }

  async getAccountPosts(accountId: string): Promise<AccountPost[]> {
    const accountRecord = DatabaseService.getInstance().getAccount(accountId)
    if (!accountRecord || accountRecord.platform !== 'weixinchannel') return []

    try {
      const { account, ses: targetSession } = await this.getAccountSession(
        accountId,
        accountRecord.platform
      )
      return await withAccountProxySession(targetSession, account, async () => {
        return listPosts(targetSession)
      })
    } catch (error) {
      publishLogger.error(`getAccountPosts(${accountId}) failed:`, error)
      return []
    }
  }

  async getAccountComments(accountId: string, exportId: string): Promise<AccountComment[]> {
    const accountRecord = DatabaseService.getInstance().getAccount(accountId)
    if (!accountRecord || accountRecord.platform !== 'weixinchannel') return []

    try {
      const { account, ses: targetSession } = await this.getAccountSession(
        accountId,
        accountRecord.platform
      )
      return await withAccountProxySession(targetSession, account, async () => {
        return listComments(targetSession, exportId)
      })
    } catch (error) {
      publishLogger.error(`getAccountComments(${accountId}) failed:`, error)
      return []
    }
  }

  async replyAccountComment(
    accountId: string,
    exportId: string,
    content: string,
    replyCommentId?: string
  ): Promise<AccountComment | null> {
    const accountRecord = DatabaseService.getInstance().getAccount(accountId)
    if (!accountRecord || accountRecord.platform !== 'weixinchannel') return null

    try {
      const { account, ses: targetSession } = await this.getAccountSession(
        accountId,
        accountRecord.platform
      )
      return await withAccountProxySession(targetSession, account, async () => {
        return createComment(targetSession, exportId, content, replyCommentId)
      })
    } catch (error) {
      publishLogger.error(`replyAccountComment(${accountId}) failed:`, error)
      return null
    }
  }

  async getAccountDmSessions(accountId: string): Promise<DmSession[]> {
    const accountRecord = DatabaseService.getInstance().getAccount(accountId)
    if (!accountRecord || accountRecord.platform !== 'weixinchannel') return []

    try {
      const { account, ses: targetSession } = await this.getAccountSession(
        accountId,
        accountRecord.platform
      )
      return await withAccountProxySession(targetSession, account, async () => {
        return listDmSessions(targetSession)
      })
    } catch (error) {
      publishLogger.error(`getAccountDmSessions(${accountId}) failed:`, error)
      return []
    }
  }

  async getAccountDmMessages(accountId: string, sessionId: string): Promise<DmMessage[]> {
    const accountRecord = DatabaseService.getInstance().getAccount(accountId)
    if (!accountRecord || accountRecord.platform !== 'weixinchannel') return []

    try {
      const { account, ses: targetSession } = await this.getAccountSession(
        accountId,
        accountRecord.platform
      )
      return await withAccountProxySession(targetSession, account, async () => {
        return listDmMessages(targetSession, sessionId)
      })
    } catch (error) {
      publishLogger.error(`getAccountDmMessages(${accountId}) failed:`, error)
      return []
    }
  }

  async sendAccountDm(
    accountId: string,
    sessionId: string,
    toUsername: string,
    text: string
  ): Promise<DmMessage | null> {
    const accountRecord = DatabaseService.getInstance().getAccount(accountId)
    if (!accountRecord || accountRecord.platform !== 'weixinchannel') return null

    try {
      const { account, ses: targetSession } = await this.getAccountSession(
        accountId,
        accountRecord.platform
      )
      return await withAccountProxySession(targetSession, account, async () => {
        return sendDm(targetSession, toUsername, text, sessionId)
      })
    } catch (error) {
      publishLogger.error(`sendAccountDm(${accountId}) failed:`, error)
      return null
    }
  }

  /**
   * Re-detect login status and refresh user info (nickname/avatar) for an
   * account, persist the result and notify the UI. Used by the manual
   * "检测" action and automatically after an account tab closes, so the
   * account list reflects reality right after the user logs in.
   */
  async refreshAccountInfo(accountId: string): Promise<Account | null> {
    const db = DatabaseService.getInstance()
    const account = db.getAccount(accountId)
    if (!account) return null

    const isLoggedIn = await this.getLoginStatus(accountId, account.platform)
    const updates: Partial<Account> = { isLoggedIn }
    if (isLoggedIn) {
      updates.lastLoginAt = Date.now()
      let identityInfo: FetchedAccountUserInfo | null = null
      try {
        identityInfo = await this.fetchUserInfo(accountId, account.platform)
        if (identityInfo) {
          updates.username = identityInfo.username
          if (identityInfo.displayName) updates.displayName = identityInfo.displayName
          if (identityInfo.avatar) updates.avatar = identityInfo.avatar
        }
      } catch (error) {
        publishLogger.error(`refreshAccountInfo(${accountId}) failed:`, error)
      }

      const identityStats = identityInfo?.stats
      if (identityStats && hasAccountStatMetrics(identityStats)) {
        updates.stats = identityStats
      } else {
        try {
          const sessionInfo = await this.fetchUserInfoFromSession(accountId, account.platform)
          const sessionStats = sessionInfo?.stats
          if (sessionStats && hasAccountStatMetrics(sessionStats)) {
            updates.stats = sessionStats
          }
        } catch (error) {
          publishLogger.error(`refreshAccountInfo(${accountId}) stats refresh failed:`, error)
        }
      }
    }

    try {
      const health = await this.getAccountHealth(accountId, account.platform, isLoggedIn)
      if (health.state === 'logged_out') {
        updates.isLoggedIn = false
      }
      const shouldPreserveHealth =
        health.state === 'unknown' &&
        account.health !== undefined &&
        (isLoggedIn
          ? account.health.state === 'restricted' ||
            account.health.state === 'banned' ||
            account.health.state === 'active'
          : account.health.state !== 'unknown')
      if (!shouldPreserveHealth) {
        updates.health = health
      }
    } catch (error) {
      publishLogger.error(`refreshAccountInfo(${accountId}) health refresh failed:`, error)
      if (!account.health || account.health.state === 'unknown') {
        updates.health = { state: 'unknown', updatedAt: Date.now() }
      }
    }

    const updated = db.updateAccount(accountId, updates)
    if (updated) {
      // Never broadcast the decrypted proxy password to UI webContents
      // (the web dashboard hosts remote content).
      this.broadcastToUi(IPC_CHANNELS.ACCOUNT_UPDATED_EVENT, toPublicAccount(updated))
    }
    return updated
  }

  /**
   * Get the active view
   */
  getActiveView(): ManagedBrowserView | null {
    if (!this.activeViewId) return null
    return this.views.get(this.activeViewId) || null
  }

  /**
   * Get all managed views
   */
  getAllViews(): Map<string, ManagedBrowserView> {
    return this.views
  }

  async reapplyAccountProxy(accountId: string): Promise<void> {
    const account = DatabaseService.getInstance().getAccount(accountId)
    if (!account) {
      return
    }

    await applyAccountProxyToTrackedAccountSessions(account)
  }

  /**
   * Update bounds for all views (called on window resize or sidebar state change)
   */
  updateBounds(): void {
    this.updateAllViewBounds()
  }

  /**
   * Update bounds for all views based on current window size
   * All BrowserViews start below the browser chrome.
   */
  /**
   * Keep the always-on-top surfaces above all content views. Re-adding a child
   * view makes it topmost, so order matters: tab bar first, then the toast
   * overlay on the very top.
   */
  private raiseTopSurfaces(): void {
    if (this.mainWindow.isDestroyed()) return
    const contentView = this.mainWindow.contentView
    if (this.tabBarView) contentView.addChildView(this.tabBarView)
    if (this.toastOverlayView) contentView.addChildView(this.toastOverlayView)
  }

  /**
   * Position the toast overlay over the bottom-right toast stack, or park it
   * just off the bottom edge when there is no toast (invisible + click-through),
   * keeping a stable viewport width so it can still measure the next toast.
   */
  private applyToastOverlayBounds(size: DesktopToastOverlaySize | null): void {
    this.toastOverlaySize = size
    if (!this.toastOverlayView || this.mainWindow.isDestroyed()) return
    const [winW, winH] = this.mainWindow.getContentSize()
    const width = size?.width ?? TOAST_OVERLAY_WIDTH
    const x = Math.max(0, winW - width)
    if (!size || size.height <= 0) {
      this.toastOverlayView.setBounds({ x, y: winH, width, height: 1 })
      return
    }
    const height = Math.min(size.height, winH)
    this.toastOverlayView.setBounds({ x, y: Math.max(0, winH - height), width, height })
  }

  /** Send to the overlay renderer, buffering until it signals readiness. */
  private sendToToastOverlay(channel: string, payload: unknown): void {
    const wc = this.toastOverlayView?.webContents
    if (this.toastOverlayReady && wc && !wc.isDestroyed()) {
      wc.send(channel, payload)
    } else {
      this.pendingToastMessages.push({ channel, payload })
    }
  }

  /**
   * Create the transparent toast overlay view (once). It loads the dedicated
   * overlay.html surface and is added on top of everything.
   */
  private async ensureToastOverlay(): Promise<void> {
    if (this.toastOverlayView) return

    const view = new WebContentsView({
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        transparent: true,
        // Keep animating while the window is occluded.
        backgroundThrottling: false
      }
    })
    this.toastOverlayView = view
    view.setBackgroundColor('#00000000')
    this.installNavigationGuard(view.webContents, 'toast-overlay')
    view.webContents.setWindowOpenHandler(({ url }) => {
      void openExternalUrl(url)
      return { action: 'deny' }
    })

    // Park off-window until the first toast measurement arrives.
    this.applyToastOverlayBounds(null)
    this.mainWindow.contentView.addChildView(view)

    const isDev = !!process.env.ELECTRON_RENDERER_URL
    if (isDev) {
      await view.webContents.loadURL(`${process.env.ELECTRON_RENDERER_URL}/overlay.html`)
    } else {
      await view.webContents.loadFile(join(__dirname, '../renderer/overlay.html'))
    }
    this.debugAttachConsoleCapture(view.webContents, 'toast-overlay')
    publishLogger.info('Toast overlay view created')
  }

  /**
   * Register process-global IPC for the toast overlay (once). Renderers emit
   * toasts here; main forwards them to the overlay and resizes the overlay view
   * from the overlay's own measurements.
   */
  private setupToastOverlayIpc(): void {
    if (toastOverlayIpcRegistered) return
    toastOverlayIpcRegistered = true

    ipcMain.on(IPC_CHANNELS.TOAST_EMIT, (_, payload: DesktopToastPayload) => {
      void this.ensureToastOverlay()
      this.sendToToastOverlay(IPC_CHANNELS.TOAST_RENDER, payload)
    })
    ipcMain.on(IPC_CHANNELS.TOAST_DISMISS, (_, id?: string) => {
      this.sendToToastOverlay(IPC_CHANNELS.TOAST_RENDER_DISMISS, id)
    })
    ipcMain.on(IPC_CHANNELS.TOAST_MEASURE, (_, size: DesktopToastOverlaySize | null) => {
      // The first measurement doubles as the overlay's readiness signal: flush
      // any toasts queued before its listeners were wired up.
      if (!this.toastOverlayReady) {
        this.toastOverlayReady = true
        const wc = this.toastOverlayView?.webContents
        if (wc && !wc.isDestroyed()) {
          for (const message of this.pendingToastMessages) {
            wc.send(message.channel, message.payload)
          }
        }
        this.pendingToastMessages = []
      }
      this.applyToastOverlayBounds(size)
    })
  }

  private updateAllViewBounds(): void {
    if (this.mainWindow.isDestroyed()) return

    const [width, height] = this.mainWindow.getContentSize()

    // Update tab bar view. While the native home tab is active the renderer
    // view covers the whole window (it renders the home UI below the chrome);
    // otherwise it shrinks to the tab strip above the content views.
    if (this.tabBarView) {
      const chromeHeight = this.isNativeHomeActive() ? height : TABBAR_HEIGHT
      this.tabBarView.setBounds({
        x: 0,
        y: 0,
        width: width,
        height: chromeHeight
      })
      // Ensure tab bar stays on top
      this.raiseTopSurfaces()
    }

    // All content views start below the tab bar
    const contentTop = TABBAR_HEIGHT
    const contentHeight = height - TABBAR_HEIGHT

    // Update home view
    if (this.webDashboardView) {
      this.webDashboardView.setBounds({
        x: 0,
        y: contentTop,
        width: width,
        height: contentHeight
      })
    }

    // Update account-based views
    for (const managed of this.views.values()) {
      managed.view.setBounds({
        x: 0,
        y: contentTop,
        width: width,
        height: contentHeight
      })
    }

    // Update platform views (with toolbar) - not used in new architecture
    const topOffset = TABBAR_HEIGHT + TOOLBAR_HEIGHT
    for (const managed of this.platformViews.values()) {
      managed.view.setBounds({
        x: 0,
        y: topOffset,
        width: width,
        height: height - topOffset
      })
    }

    // Update executor views
    for (const managed of this.executorViews.values()) {
      managed.view.setBounds({
        x: 0,
        y: contentTop,
        width: width,
        height: contentHeight
      })
    }

    // Update publish group views
    for (const group of this.publishGroups.values()) {
      for (const target of group.views.values()) {
        target.view.setBounds({
          x: 0,
          y: contentTop,
          width: width,
          height: contentHeight
        })
      }
    }

    // Toast overlay: re-hug the bottom-right toast stack for the new window size
    // (or stay parked off-window when there is no toast).
    if (this.toastOverlayView) {
      this.applyToastOverlayBounds(this.toastOverlaySize)
    }
  }

  // ============================================
  // Platform-based methods (without accountId)
  // ============================================

  /**
   * Open or get a WebContentsView for a platform (without account binding)
   * Session partition: persist:{platform}-default
   */
  async openPlatformView(
    platform: PlatformType,
    contentType?: SyncContentType,
    url?: string
  ): Promise<WebContentsView> {
    // Check if view already exists
    const existing = this.platformViews.get(platform)
    if (existing) {
      await this.showPlatformView(platform)
      // Navigate to appropriate URL for content type
      const targetUrl = url || this.getPublishUrl(platform, contentType)
      if (targetUrl) {
        await this.navigatePlatform(platform, targetUrl)
      }
      return existing.view
    }

    // Create partition for session isolation (shared for the platform)
    const partition = `persist:${platform}-default`
    const ses = session.fromPartition(partition)
    hardenSession(ses)
    // local-file:// requests are gated by the capability allowlist in
    // sessionHardening (only app-handed-out paths are servable).
    registerLocalFileProtocol(ses)
    await registerGlobalProxySession(ses)

    // Create WebContentsView with isolated session
    const view = new WebContentsView({
      webPreferences: createThirdPartyContentWebPreferences(ses)
    })
    this.installNavigationGuard(view.webContents, `platform:${platform}`)

    // Set bounds (full width, reserve space for tab bar and toolbar)
    const [width, height] = this.mainWindow.getContentSize()
    const topOffset = TABBAR_HEIGHT + TOOLBAR_HEIGHT
    view.setBounds({
      x: 0,
      y: topOffset,
      width: width,
      height: height - topOffset
    })
    // Disable auto-resize, we manage bounds manually via resize listener
    this.installThirdPartyWindowOpenHandler(view, ses)

    // Store the managed view (not visible initially)
    this.platformViews.set(platform, {
      view,
      platform,
      isVisible: false
    })

    // Navigate to URL based on content type (load in background)
    const targetUrl = url || this.getPublishUrl(platform, contentType)
    try {
      const loadResult = await this.loadURLWithNavigationHandling(
        view.webContents,
        targetUrl,
        `platform:${platform}:open`
      )
      this.throwIfPublishNavigationFailed(loadResult, '打开平台发布页面')
    } catch (error: unknown) {
      this.platformViews.delete(platform)
      if (this.activePlatformId === platform) {
        this.activePlatformId = null
      }
      if (!view.webContents.isDestroyed()) {
        view.webContents.close()
      }
      throw error
    }

    // Listen for navigation events
    view.webContents.on('did-navigate', (_event, navigatedUrl) => {
      this.mainWindow.webContents.send('browser:platformNavigated', {
        platform,
        url: navigatedUrl
      })
    })

    return view
  }

  /**
   * Get the publish URL for a platform and content type
   */
  private getPublishUrl(platform: PlatformType, contentType?: SyncContentType): string {
    const extensionInjectUrl = getExtensionInjectUrl(platform, contentType)
    if (extensionInjectUrl) {
      return extensionInjectUrl
    }

    // If content type is specified, try to get specific URL
    if (contentType && PLATFORM_PUBLISH_URLS[platform]?.[contentType]) {
      return PLATFORM_PUBLISH_URLS[platform][contentType]!
    }
    // Fall back to adapter's publishUrl or platform home URL
    const adapter = getAdapter(platform, contentType)
    return adapter?.publishUrl || PLATFORMS[platform]?.url || 'about:blank'
  }

  private normalizeNavigationUrl(url: string): string {
    const trimmed = url.trim()
    if (!trimmed) return ''

    try {
      const normalized = new URL(trimmed)
      return normalized.toString()
    } catch {
      if (trimmed.startsWith('/')) {
        const baseUrl = is.dev
          ? (process.env.MULTIPOST_WEB_URL || 'http://localhost:3000')
          : 'https://multipost.app'
        return new URL(trimmed, baseUrl).toString()
      }

      const localhostPattern = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/.*)?$/i
      if (localhostPattern.test(trimmed)) {
        return `http://${trimmed}`
      }

      const hasLikelyDomain = /^[^\s/]+\.[^\s/]+(?:\/.*)?$/.test(trimmed)
      return hasLikelyDomain ? `https://${trimmed}` : trimmed
    }
  }

  /**
   * Wait until the page is actually usable instead of sleeping a fixed amount:
   * loading finished + document.readyState complete + a short settle for SPA
   * hydration. Capped at PAGE_READY_TIMEOUT_MS so a stuck page can't hang the
   * whole publish run.
   */
  private async waitForPageReady(
    webContents: Electron.WebContents,
    options: { timeoutMs?: number; isCancelled?: () => boolean } = {}
  ): Promise<'ready' | 'timeout' | 'cancelled'> {
    const timeoutMs = options.timeoutMs ?? PAGE_READY_TIMEOUT_MS
    const deadline = Date.now() + timeoutMs
    const cancelled = (): boolean => options.isCancelled?.() === true

    while (Date.now() < deadline) {
      if (cancelled()) return 'cancelled'
      if (webContents.isDestroyed()) return 'cancelled'
      if (!webContents.isLoading()) {
        try {
          const readyState = await webContents.executeJavaScript('document.readyState')
          if (readyState === 'complete') {
            await new Promise((resolve) => setTimeout(resolve, PAGE_READY_SETTLE_MS))
            return cancelled() ? 'cancelled' : 'ready'
          }
        } catch {
          // A navigation can race the executeJavaScript; keep polling
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
    return 'timeout'
  }

  private async waitForNavigationSettle(webContents?: Electron.WebContents): Promise<void> {
    if (webContents && !webContents.isDestroyed()) {
      await this.waitForPageReady(webContents, { timeoutMs: 15_000 })
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  private async loadExactUrlIfNeeded(webContents: Electron.WebContents, targetUrl: string): Promise<void> {
    if (this.normalizeNavigationUrl(webContents.getURL()) === this.normalizeNavigationUrl(targetUrl)) {
      return
    }
    if (this.blockUnsupportedNavigation(targetUrl, 'loadExactUrlIfNeeded')) {
      return
    }
    const loadResult = await this.loadURLWithNavigationHandling(
      webContents,
      targetUrl,
      'publish:loadExactUrlIfNeeded'
    )
    this.throwIfPublishNavigationFailed(loadResult, '打开发布页面')
    await this.waitForNavigationSettle(webContents)
  }

  private async submitExtensionBackedContent(
    webContents: Electron.WebContents,
    entry: DesktopInjectorManifestEntry,
    normalizedData: SyncContentData
  ): Promise<ExtensionFillResult> {
    await this.loadExactUrlIfNeeded(webContents, entry.injectUrl)

    const extensionResult = await executeExtensionFill(
      webContents,
      entry.desktopPlatform,
      entry.contentType,
      normalizedData,
      true
    )
    if (!extensionResult.handled) {
      throw new Error(`No adapter found for platform: ${entry.desktopPlatform}`)
    }
    if (!extensionResult.ok) {
      throw new Error(extensionResult.error || '扩展发布脚本执行失败')
    }
    return extensionResult
  }

  /**
   * Show a platform WebContentsView
   */
  async showPlatformView(platform: PlatformType): Promise<void> {
    const managed = this.platformViews.get(platform)
    if (!managed) return

    this.hideAllPlatformViewsExcept(platform)
    this.mainWindow.contentView.addChildView(managed.view)
    managed.isVisible = true
    this.activePlatformId = platform

    // Ensure tab bar stays on top and shrink the renderer chrome
    if (this.tabBarView) {
      this.raiseTopSurfaces()
    }
    this.updateAllViewBounds()
  }

  /**
   * Hide a platform WebContentsView
   */
  async hidePlatformView(platform: PlatformType): Promise<void> {
    const managed = this.platformViews.get(platform)
    if (!managed) return

    this.mainWindow.contentView.removeChildView(managed.view)
    managed.isVisible = false

    if (this.activePlatformId === platform) {
      this.activePlatformId = null
    }

    // Expand the renderer chrome again if this returns us to native home
    this.updateAllViewBounds()
  }

  /**
   * Hide all platform views except the specified one
   */
  private hideAllPlatformViewsExcept(platform: PlatformType): void {
    for (const [id, managed] of this.platformViews) {
      if (id !== platform && managed.isVisible) {
        this.mainWindow.contentView.removeChildView(managed.view)
        managed.isVisible = false
      }
    }
    // Also hide account-based views
    for (const managed of this.views.values()) {
      if (managed.isVisible) {
        this.mainWindow.contentView.removeChildView(managed.view)
        managed.isVisible = false
      }
    }
    this.activeViewId = null
  }

  /**
   * Hide all platform views (used when switching to non-publish views)
   */
  hideAllPlatformViews(): void {
    for (const managed of this.platformViews.values()) {
      if (managed.isVisible) {
        this.mainWindow.contentView.removeChildView(managed.view)
        managed.isVisible = false
      }
    }
    // Also hide account-based views
    for (const managed of this.views.values()) {
      if (managed.isVisible) {
        this.mainWindow.contentView.removeChildView(managed.view)
        managed.isVisible = false
      }
    }
    this.activeViewId = null
    this.activePlatformId = null

    // Expand the renderer chrome again if this returns us to native home
    this.updateAllViewBounds()
  }

  /**
   * Navigate a platform view to a URL
   */
  async navigatePlatform(platform: PlatformType, url: string): Promise<void> {
    const managed = this.platformViews.get(platform)
    if (!managed) {
      throw new Error(`No view found for platform: ${platform}`)
    }
    const loadResult = await this.loadURLWithNavigationHandling(
      managed.view.webContents,
      url,
      `platform:${platform}:navigate`
    )
    this.throwIfPublishNavigationFailed(loadResult, '打开平台页面')
  }

  /**
   * Execute JavaScript in a platform WebContentsView
   */
  async executePlatformScript<T = unknown>(platform: PlatformType, script: string): Promise<T> {
    const managed = this.platformViews.get(platform)
    if (!managed) {
      throw new Error(`No view found for platform: ${platform}`)
    }
    return managed.view.webContents.executeJavaScript(script)
  }

  /**
   * Fill content to a platform using its adapter
   */
  async fillPlatformContent(
    platform: PlatformType,
    contentType: SyncContentType,
    data: SyncContentData,
    isAutoPublish = false
  ): Promise<ExtensionFillResult> {
    const managed = this.platformViews.get(platform)
    if (!managed) {
      throw new Error(`No view found for platform: ${platform}`)
    }

    const normalizedData = this.normalizeContentData(data)
    this.platformPublishPayloads.set(
      this.getPlatformPublishPayloadKey(platform, contentType),
      normalizedData
    )

    const extensionInjectUrl = getExtensionInjectUrl(platform, contentType)
    if (extensionInjectUrl) {
      await this.loadExactUrlIfNeeded(managed.view.webContents, extensionInjectUrl)
    } else {
      // Navigate to publish URL if not already there
      const publishUrl = this.getPublishUrl(platform, contentType)
      const currentUrl = managed.view.webContents.getURL()
      let shouldLoadPublishUrl = true
      try {
        const targetHostname = new URL(publishUrl).hostname
        shouldLoadPublishUrl = targetHostname
          ? !currentUrl.includes(targetHostname)
          : this.normalizeNavigationUrl(currentUrl) !== this.normalizeNavigationUrl(publishUrl)
      } catch {
        shouldLoadPublishUrl =
          this.normalizeNavigationUrl(currentUrl) !== this.normalizeNavigationUrl(publishUrl)
      }
      if (shouldLoadPublishUrl) {
        const loadResult = await this.loadURLWithNavigationHandling(
          managed.view.webContents,
          publishUrl,
          `platform:${platform}:fill`
        )
        this.throwIfPublishNavigationFailed(loadResult, '打开平台发布页面')
        await this.waitForNavigationSettle(managed.view.webContents)
      }
    }

    const extensionResult = await executeExtensionFill(
      managed.view.webContents,
      platform,
      contentType,
      normalizedData,
      isAutoPublish
    )
    if (extensionResult.handled) {
      if (!extensionResult.ok) {
        throw new Error(extensionResult.error || '扩展发布脚本执行失败')
      }
      return extensionResult
    }

    const adapter = getAdapter(platform, contentType)
    if (!adapter) {
      throw new Error(`No adapter found for platform: ${platform}`)
    }

    const fillScript = adapter.getFillScript(contentType, normalizedData)
    await managed.view.webContents.executeJavaScript(fillScript)
    return extensionResult
  }

  /**
   * Submit content on a platform using its adapter
   */
  async submitPlatformContent(platform: PlatformType, contentType: SyncContentType): Promise<void> {
    const managed = this.platformViews.get(platform)
    if (!managed) {
      throw new Error(`No view found for platform: ${platform}`)
    }

    const adapter = getAdapter(platform, contentType)
    if (!adapter) {
      const entry = getDesktopInjectorManifestEntry(platform, contentType)
      if (entry) {
        const normalizedData = this.platformPublishPayloads.get(
          this.getPlatformPublishPayloadKey(platform, contentType)
        )
        if (!normalizedData) {
          throw new Error(`No filled content data found for extension submit: ${platform}`)
        }
        await this.submitExtensionBackedContent(managed.view.webContents, entry, normalizedData)
        return
      }
      throw new Error(`No adapter found for platform: ${platform}`)
    }

    // Call the adapter's submit method with content type
    const result = await adapter.submit(managed.view, contentType)
    if (!result.success) {
      throw new Error(result.error || '发布失败')
    }
  }

  /**
   * Close a platform WebContentsView
   */
  async closePlatformView(platform: PlatformType): Promise<void> {
    const managed = this.platformViews.get(platform)
    if (!managed) return

    this.mainWindow.contentView.removeChildView(managed.view)
    managed.view.webContents.close()
    this.platformViews.delete(platform)
    this.clearPublishPayloadsForPrefix(this.platformPublishPayloads, `${platform}:`)

    if (this.activePlatformId === platform) {
      this.activePlatformId = null
    }
  }

  /**
   * Get the active platform view
   */
  getActivePlatformView(): PlatformBrowserView | null {
    if (!this.activePlatformId) return null
    return this.platformViews.get(this.activePlatformId) || null
  }

  /**
   * Go back in the platform browser history
   */
  async platformGoBack(platform: PlatformType): Promise<void> {
    const managed = this.platformViews.get(platform)
    if (!managed) return

    if (managed.view.webContents.canGoBack()) {
      managed.view.webContents.goBack()
    }
  }

  /**
   * Go forward in the platform browser history
   */
  async platformGoForward(platform: PlatformType): Promise<void> {
    const managed = this.platformViews.get(platform)
    if (!managed) return

    if (managed.view.webContents.canGoForward()) {
      managed.view.webContents.goForward()
    }
  }

  /**
   * Refresh the platform browser
   */
  async platformRefresh(platform: PlatformType): Promise<void> {
    const managed = this.platformViews.get(platform)
    if (!managed) return

    managed.view.webContents.reload()
  }

  /**
   * Get the active platform ID
   */
  getActivePlatformId(): PlatformType | null {
    return this.activePlatformId
  }

  /**
   * Switch to a specific platform view (hide current, show target)
   */
  switchToPlatformView(platform: PlatformType): void {
    const target = this.platformViews.get(platform)
    if (!target) return

    // Hide current active view
    if (this.activePlatformId && this.activePlatformId !== platform) {
      const current = this.platformViews.get(this.activePlatformId)
      if (current && current.isVisible) {
        this.mainWindow.contentView.removeChildView(current.view)
        current.isVisible = false
      }
    }

    // Show target view
    if (!target.isVisible) {
      this.mainWindow.contentView.addChildView(target.view)
      target.isVisible = true
      // Re-apply bounds in case window was resized
      const [width, height] = this.mainWindow.getContentSize()
      const topOffset = TABBAR_HEIGHT + TOOLBAR_HEIGHT
      target.view.setBounds({
        x: 0,
        y: topOffset,
        width: width,
        height: height - topOffset
      })
    }

    this.activePlatformId = platform
  }

  /**
   * Get list of open platform IDs
   */
  getOpenPlatforms(): PlatformType[] {
    return Array.from(this.platformViews.keys())
  }

  /**
   * Close all platform views
   */
  async closeAllPlatformViews(): Promise<void> {
    const platforms = Array.from(this.platformViews.keys())
    for (const platform of platforms) {
      await this.closePlatformView(platform)
    }
  }

  // ========== Executor WebContentsView Management ==========
  // Executor views are keyed by accountId to support multiple accounts per platform

  /**
   * Open an executor WebContentsView for an account
   * @param accountId - The account ID (used as key for executor view)
   * @param platform - The platform type
   * @param contentType - Optional content type to determine the URL
   * @param sessionPartition - Session partition from account for session isolation
   */
  async openExecutorView(
    accountId: string,
    platform: PlatformType,
    contentType?: SyncContentType,
    sessionPartition?: string
  ): Promise<WebContentsView> {
    const account = DatabaseService.getInstance().getAccount(accountId)

    // Check if view already exists for this account
    const existing = this.executorViews.get(accountId)
    if (existing) {
      await applyAccountProxy(existing.view.webContents.session, account)
      await this.showExecutorView(accountId)
      return existing.view
    }

    // Create partition for session isolation
    // Use account session partition if provided, otherwise fall back to executor-specific partition
    const partition = sessionPartition || `persist:executor-${accountId}`
    const ses = session.fromPartition(partition)
    hardenSession(ses)
    // local-file:// requests are gated by the capability allowlist in
    // sessionHardening (only app-handed-out paths are servable).
    registerLocalFileProtocol(ses)
    await applyAccountProxy(ses, account)

    // Create WebContentsView
    const view = new WebContentsView({
      webPreferences: createThirdPartyContentWebPreferences(ses)
    })
    this.installNavigationGuard(view.webContents, `executor:${accountId}`)

    // Set bounds for executor view (full width, reserve space for tab bar)
    const [width, height] = this.mainWindow.getContentSize()
    const topOffset = TABBAR_HEIGHT
    view.setBounds({
      x: 0,
      y: topOffset,
      width: width,
      height: height - topOffset
    })

    // Disable auto-resize, we manage bounds manually via resize listener
    this.installThirdPartyWindowOpenHandler(view, ses)
    trackAccountProxyForWebContents(view.webContents)

    // Store the view keyed by accountId
    this.executorViews.set(accountId, {
      view,
      accountId,
      platform,
      isVisible: false
    })

    // Navigate to publish URL if contentType specified, otherwise platform home
    const url = this.getPublishUrl(platform, contentType)
    try {
      const loadResult = await this.loadURLWithNavigationHandling(
        view.webContents,
        url,
        `executor:${accountId}:open`
      )
      this.throwIfPublishNavigationFailed(loadResult, '打开账号发布页面')
    } catch (error: unknown) {
      this.executorViews.delete(accountId)
      if (this.activeExecutorId === accountId) {
        this.activeExecutorId = null
      }
      await releaseAccountProxyForWebContents(view.webContents)
      if (!view.webContents.isDestroyed()) {
        view.webContents.close()
      }
      throw error
    }

    // Show the view
    await this.showExecutorView(accountId)

    return view
  }

  /**
   * Show an executor WebContentsView by accountId
   */
  async showExecutorView(accountId: string): Promise<void> {
    const managed = this.executorViews.get(accountId)
    if (!managed) return

    // Hide all other executor views
    this.hideAllExecutorViewsExcept(accountId)

    // Also hide platform views
    this.hideAllPlatformViews()

    // Show this view
    this.mainWindow.contentView.addChildView(managed.view)
    managed.isVisible = true
    this.activeExecutorId = accountId

    // Ensure tab bar stays on top
    if (this.tabBarView) {
      this.raiseTopSurfaces()
    }

    // Shrink the renderer chrome and apply consistent content bounds
    this.updateAllViewBounds()
  }

  /**
   * Hide an executor WebContentsView by accountId
   */
  async hideExecutorView(accountId: string): Promise<void> {
    const managed = this.executorViews.get(accountId)
    if (!managed) return

    this.mainWindow.contentView.removeChildView(managed.view)
    managed.isVisible = false

    if (this.activeExecutorId === accountId) {
      this.activeExecutorId = null
    }

    // Expand the renderer chrome again if this returns us to native home
    this.updateAllViewBounds()
  }

  /**
   * Hide all executor views except the specified one
   */
  private hideAllExecutorViewsExcept(accountId: string): void {
    for (const [id, managed] of this.executorViews) {
      if (id !== accountId && managed.isVisible) {
        this.mainWindow.contentView.removeChildView(managed.view)
        managed.isVisible = false
      }
    }
  }

  /**
   * Hide all executor views
   */
  hideAllExecutorViews(): void {
    for (const managed of this.executorViews.values()) {
      if (managed.isVisible) {
        this.mainWindow.contentView.removeChildView(managed.view)
        managed.isVisible = false
      }
    }
    this.activeExecutorId = null

    // Expand the renderer chrome again if this returns us to native home
    this.updateAllViewBounds()
  }

  /**
   * Close an executor WebContentsView by accountId
   */
  async closeExecutorView(accountId: string): Promise<void> {
    const managed = this.executorViews.get(accountId)
    if (!managed) return

    this.mainWindow.contentView.removeChildView(managed.view)
    await releaseAccountProxyForWebContents(managed.view.webContents)
    managed.view.webContents.close()
    this.executorViews.delete(accountId)
    this.clearPublishPayloadsForPrefix(this.executorPublishPayloads, `${accountId}:`)

    if (this.activeExecutorId === accountId) {
      this.activeExecutorId = null
    }

    // Expand the renderer chrome again if this returns us to native home
    this.updateAllViewBounds()
  }

  /**
   * Get list of open executor accountIds
   */
  getOpenExecutorAccounts(): string[] {
    return Array.from(this.executorViews.keys())
  }

  /**
   * Get executor info for all open executors (accountId -> platform mapping)
   */
  getOpenExecutors(): Array<{ accountId: string; platform: PlatformType }> {
    return Array.from(this.executorViews.values()).map((v) => ({
      accountId: v.accountId,
      platform: v.platform
    }))
  }

  /**
   * Get the active executor accountId
   */
  getActiveExecutorId(): string | null {
    return this.activeExecutorId
  }

  /**
   * Get executor view info by accountId
   */
  getExecutorView(accountId: string): ExecutorBrowserView | undefined {
    return this.executorViews.get(accountId)
  }

  /**
   * Fill content in an executor WebContentsView using platform adapter
   */
  async fillExecutorContent(
    accountId: string,
    contentType: SyncContentType,
    data: SyncContentData,
    isAutoPublish = false,
    taskId?: string
  ): Promise<ExtensionFillResult> {
    const managed = this.executorViews.get(accountId)
    if (!managed) {
      throw new Error(`No executor view found for account: ${accountId}`)
    }

    if (this.isExecutorPublishCancelled(taskId)) {
      this.setExecutorTargetStatus(taskId, accountId, 'cancelled')
      throw new Error('Publish cancelled')
    }

    this.setExecutorTargetStatus(taskId, accountId, 'filling')

    try {
      const normalizedData = this.normalizeContentData(data)
      this.executorPublishPayloads.set(
        this.getExecutorPublishPayloadKey(accountId, contentType),
        normalizedData
      )

      const extensionInjectUrl = getExtensionInjectUrl(managed.platform, contentType)
      if (extensionInjectUrl) {
        await this.loadExactUrlIfNeeded(managed.view.webContents, extensionInjectUrl)
      } else {
        // Navigate to publish URL if not already there
        const publishUrl = this.getPublishUrl(managed.platform, contentType)
        const currentUrl = managed.view.webContents.getURL()
        let shouldLoadPublishUrl = true
        try {
          const targetHostname = new URL(publishUrl).hostname
          shouldLoadPublishUrl = targetHostname
            ? !currentUrl.includes(targetHostname)
            : this.normalizeNavigationUrl(currentUrl) !== this.normalizeNavigationUrl(publishUrl)
        } catch {
          shouldLoadPublishUrl =
            this.normalizeNavigationUrl(currentUrl) !== this.normalizeNavigationUrl(publishUrl)
        }
        if (shouldLoadPublishUrl) {
          const loadResult = await this.loadURLWithNavigationHandling(
            managed.view.webContents,
            publishUrl,
            `executor:${accountId}:fill`
          )
          this.throwIfPublishNavigationFailed(loadResult, '打开账号发布页面')
          await this.waitForNavigationSettle(managed.view.webContents)
        }
      }

      if (this.isExecutorPublishCancelled(taskId)) {
        this.setExecutorTargetStatus(taskId, accountId, 'cancelled')
        throw new Error('Publish cancelled')
      }

      const extensionResult = await executeExtensionFill(
        managed.view.webContents,
        managed.platform,
        contentType,
        normalizedData,
        isAutoPublish
      )

      if (this.isExecutorPublishCancelled(taskId)) {
        this.setExecutorTargetStatus(taskId, accountId, 'cancelled')
        throw new Error('Publish cancelled')
      }

      if (extensionResult.handled) {
        if (!extensionResult.ok) {
          throw new Error(extensionResult.error || '扩展发布脚本执行失败')
        }
        // TODO(future): plug in real publish confirmation once injectors report that the post went live.
        this.setExecutorTargetStatus(taskId, accountId, 'ready', {
          extensionKey: extensionResult.extensionKey
        })
        return extensionResult
      }

      const adapter = getAdapter(managed.platform, contentType)
      if (!adapter) {
        throw new Error(`No adapter found for platform: ${managed.platform}`)
      }

      const fillScript = adapter.getFillScript(contentType, normalizedData)
      await managed.view.webContents.executeJavaScript(fillScript)
      if (this.isExecutorPublishCancelled(taskId)) {
        this.setExecutorTargetStatus(taskId, accountId, 'cancelled')
        throw new Error('Publish cancelled')
      }
      this.setExecutorTargetStatus(taskId, accountId, 'ready')
      return extensionResult
    } catch (error) {
      if (this.isExecutorPublishCancelled(taskId)) {
        this.setExecutorTargetStatus(taskId, accountId, 'cancelled')
      } else {
        this.setExecutorTargetStatus(taskId, accountId, 'failed', {
          error: this.formatPublishError(error)
        })
      }
      throw error
    }
  }

  /**
   * Submit content in an executor WebContentsView
   */
  async submitExecutorContent(
    accountId: string,
    contentType: SyncContentType,
    taskId?: string
  ): Promise<void> {
    const managed = this.executorViews.get(accountId)
    if (!managed) {
      throw new Error(`No executor view found for account: ${accountId}`)
    }

    if (this.isExecutorPublishCancelled(taskId)) {
      this.setExecutorTargetStatus(taskId, accountId, 'cancelled')
      throw new Error('Publish cancelled')
    }

    try {
      const adapter = getAdapter(managed.platform, contentType)
      if (!adapter) {
        const entry = getDesktopInjectorManifestEntry(managed.platform, contentType)
        if (entry) {
          const normalizedData = this.executorPublishPayloads.get(
            this.getExecutorPublishPayloadKey(accountId, contentType)
          )
          if (!normalizedData) {
            throw new Error(`No filled content data found for extension submit: ${managed.platform}`)
          }
          const extensionResult = await this.submitExtensionBackedContent(
            managed.view.webContents,
            entry,
            normalizedData
          )
          if (this.isExecutorPublishCancelled(taskId)) {
            this.setExecutorTargetStatus(taskId, accountId, 'cancelled')
            throw new Error('Publish cancelled')
          }
          this.setExecutorTargetStatus(taskId, accountId, 'success', {
            extensionKey: extensionResult.extensionKey
          })
          return
        }
        throw new Error(`No adapter found for platform: ${managed.platform}`)
      }

      const result = await adapter.submit(managed.view, contentType)
      if (this.isExecutorPublishCancelled(taskId)) {
        this.setExecutorTargetStatus(taskId, accountId, 'cancelled')
        throw new Error('Publish cancelled')
      }
      if (!result.success) {
        throw new Error(result.error || '发布失败')
      }
      this.setExecutorTargetStatus(taskId, accountId, 'success', {
        postUrl: result.postUrl
      })
    } catch (error) {
      if (this.isExecutorPublishCancelled(taskId)) {
        this.setExecutorTargetStatus(taskId, accountId, 'cancelled')
      } else {
        this.setExecutorTargetStatus(taskId, accountId, 'failed', {
          error: this.formatPublishError(error)
        })
      }
      throw error
    }
  }

  // ========== Browser Tab Management ==========

  /**
   * Check if any WebContentsView is currently visible
   */
  hasVisibleView(): boolean {
    for (const managed of this.views.values()) {
      if (managed.isVisible) return true
    }
    for (const managed of this.platformViews.values()) {
      if (managed.isVisible) return true
    }
    for (const managed of this.executorViews.values()) {
      if (managed.isVisible) return true
    }
    return false
  }

  /**
   * Get all open tabs, including home tab and Group tabs
   */
  getTabs(): BrowserTab[] {
    const tabs: BrowserTab[] = []

    // Native home tab is always present (first tab)
    tabs.push({
      id: HOME_TAB_ID,
      platform: 'weibo' as PlatformType, // placeholder, not used for home
      title: 'MultiPost',
      url: '',
      faviconUrl: undefined,
      isActive: this.activeViewId === HOME_TAB_ID && !this.activeGroupId,
      isHome: true,
      canGoBack: false,
      canGoForward: false
    })

    // Web dashboard tab (only present after the user opened it)
    if (this.webDashboardView) {
      const webContents = this.webDashboardView.webContents
      tabs.push({
        id: WEB_TAB_ID,
        platform: 'weibo' as PlatformType, // placeholder, not used for web tab
        title: webContents.getTitle() || 'MultiPost Web',
        url: webContents.getURL() || '',
        faviconUrl: undefined,
        isActive: this.activeViewId === WEB_TAB_ID && !this.activeGroupId,
        isHome: false,
        isWeb: true,
        canGoBack: webContents.canGoBack(),
        canGoForward: webContents.canGoForward()
      })
    }

    // Add all platform WebContentsView tabs
    for (const [id, managed] of this.views) {
      tabs.push({
        id,
        platform: managed.platform,
        title: managed.title,
        url: managed.url,
        faviconUrl: PLATFORMS[managed.platform]?.faviconUrl,
        isActive: this.activeViewId === id && !this.activeGroupId,
        isHome: false,
        canGoBack: managed.view.webContents.canGoBack(),
        canGoForward: managed.view.webContents.canGoForward()
      })
    }

    // Add all Publish Group tabs
    for (const [groupId, group] of this.publishGroups) {
      // Get active view in group for navigation state
      const activeView = group.activeAccountId
        ? group.views.get(group.activeAccountId)
        : null

      tabs.push({
        id: groupId,
        platform: 'weibo' as PlatformType, // placeholder
        title: group.name,
        url: activeView?.view.webContents.getURL() || '',
        faviconUrl: undefined,
        isActive: this.activeGroupId === groupId,
        isHome: false,
        isGroup: true,
        groupId: groupId,
        canGoBack: activeView?.view.webContents.canGoBack() || false,
        canGoForward: activeView?.view.webContents.canGoForward() || false
      })
    }

    return tabs
  }

  /**
   * Switch to a tab by accountId (or HOME_TAB_ID for home)
   */
  async switchTab(accountId: string): Promise<void> {
    // Handle home tab
    if (accountId === HOME_TAB_ID) {
      await this.switchToHome()
      return
    }

    // Handle web dashboard tab
    if (accountId === WEB_TAB_ID) {
      await this.openWebDashboard()
      return
    }

    // Handle publish group tabs so clicking a group tab switches back to it
    if (this.publishGroups.has(accountId)) {
      await this.showPublishGroup(accountId)
      return
    }

    const managed = this.views.get(accountId)
    if (!managed) return

    await this.showView(accountId)
    this.notifyTabsChanged()
  }

  /**
   * Switch to a tab by its position in the tab strip (menu accelerators).
   */
  async switchToTabIndex(index: number): Promise<void> {
    const tabs = this.getTabs()
    const target = tabs[index]
    if (target) {
      await this.switchTab(target.id)
    }
  }

  /**
   * Cycle to the next/previous tab in the strip (menu accelerators).
   */
  async cycleTab(offset: 1 | -1): Promise<void> {
    const tabs = this.getTabs()
    if (tabs.length < 2) return
    const activeIndex = tabs.findIndex((tab) => tab.isActive)
    const nextIndex = (activeIndex + offset + tabs.length) % tabs.length
    await this.switchTab(tabs[nextIndex].id)
  }

  /**
   * Close the currently active tab; the home tab is not closable.
   */
  async closeActiveTab(): Promise<void> {
    const tabs = this.getTabs()
    const active = tabs.find((tab) => tab.isActive)
    if (!active || active.isHome) return

    if (active.isGroup && active.groupId) {
      await this.closePublishGroup(active.groupId)
      return
    }
    await this.closeTab(active.id)
  }

  /**
   * Switch to the native home tab: hide every content WebContentsView so the
   * renderer view (expanded to full window) becomes the visible surface.
   */
  async switchToHome(): Promise<void> {
    // Hide all platform views
    for (const managed of this.views.values()) {
      if (managed.isVisible) {
        this.mainWindow.contentView.removeChildView(managed.view)
        managed.isVisible = false
      }
    }

    // Hide web dashboard, publish group, platform and executor views
    if (this.webDashboardView) {
      this.mainWindow.contentView.removeChildView(this.webDashboardView)
    }
    this.hideAllGroupViews()
    this.hideAuxiliarySurfaces()

    // Ensure tab bar stays on top
    if (this.tabBarView) {
      this.raiseTopSurfaces()
    }

    this.activeViewId = HOME_TAB_ID
    this.activeGroupId = null
    this.updateAllViewBounds()
    this.notifyTabsChanged()
  }

  /**
   * Close a tab by accountId (home tab cannot be closed via this method)
   */
  async closeTab(accountId: string): Promise<boolean> {
    // Cannot close home tab
    if (accountId === HOME_TAB_ID) {
      publishLogger.info('Cannot close home tab')
      return false
    }

    // Web dashboard tab destroys its lazily created view
    if (accountId === WEB_TAB_ID) {
      this.closeWebDashboard()
      return true
    }

    const managed = this.views.get(accountId)
    if (!managed) return false

    const wasActive = this.activeViewId === accountId

    await this.closeView(accountId)

    // The user may have just logged in inside this tab; re-detect in the
    // background so the account list reflects the new state immediately.
    void this.refreshAccountInfo(accountId).catch((error) => {
      publishLogger.error('post-close account refresh failed:', error)
    })

    // If closed the active tab, switch to home or another tab
    if (wasActive) {
      if (this.views.size > 0) {
        // Switch to first available tab
        const firstTabId = this.views.keys().next().value
        if (firstTabId) {
          await this.showView(firstTabId)
        }
      } else {
        // No more tabs, switch to home
        await this.switchToHome()
      }
    }

    this.notifyTabsChanged()
    return true
  }

  /**
   * Go back in tab history
   */
  async tabGoBack(accountId: string): Promise<void> {
    const webContents = this.getWebContentsForTab(accountId)
    if (!webContents) return

    if (webContents.canGoBack()) {
      webContents.goBack()
    }
  }

  /**
   * Go forward in tab history
   */
  async tabGoForward(accountId: string): Promise<void> {
    const webContents = this.getWebContentsForTab(accountId)
    if (!webContents) return

    if (webContents.canGoForward()) {
      webContents.goForward()
    }
  }

  /**
   * Refresh a tab
   */
  async tabRefresh(accountId: string): Promise<void> {
    const webContents = this.getWebContentsForTab(accountId)
    if (!webContents) return

    webContents.reload()
  }

  private getWebContentsForTab(tabId: string): Electron.WebContents | null {
    if (tabId === HOME_TAB_ID) {
      // Native home has no web contents to navigate
      return null
    }

    if (tabId === WEB_TAB_ID) {
      return this.webDashboardView?.webContents || null
    }

    const managed = this.views.get(tabId)
    if (managed) {
      return managed.view.webContents
    }

    const group = this.publishGroups.get(tabId)
    const activeTarget = group?.activeAccountId ? group.views.get(group.activeAccountId) : null
    return activeTarget?.view.webContents || null
  }

  /**
   * Notify tab bar that tabs have changed
   */
  private notifyTabsChanged(): void {
    const tabs = this.getTabs()
    // Send to tab bar WebContentsView
    if (this.tabBarView && !this.tabBarView.webContents.isDestroyed()) {
      this.tabBarView.webContents.send('multipost:browser:tabsChanged', tabs)
    }
  }

  /**
   * Notify that group tabs have changed
   */
  private notifyGroupTabsChanged(groupId: string): void {
    const groupTabs = this.getGroupTabs(groupId)
    const group = this.publishGroups.get(groupId)
    if (this.tabBarView && !this.tabBarView.webContents.isDestroyed()) {
      this.tabBarView.webContents.send('multipost:browser:groupTabsChanged', {
        groupId,
        tabs: groupTabs,
        status: group?.status
      })
    }
  }

  // ========== Publish Group Methods ==========

  private async destroyPublishGroupViews(group: PublishGroupView): Promise<void> {
    for (const target of group.views.values()) {
      if (target.isVisible) {
        this.mainWindow.contentView.removeChildView(target.view)
        target.isVisible = false
      }
      if (!target.view.webContents.isDestroyed()) {
        await releaseAccountProxyForWebContents(target.view.webContents)
        target.view.webContents.close()
      }
    }
    group.views.clear()
  }

  /**
   * Create a new publish group with multiple target accounts
   */
  async createPublishGroup(params: {
    contentType: SyncContentType
    targets: Array<{ accountId: string; platform: PlatformType; displayName: string }>
    data: SyncContentData
    autoPublish?: boolean
  }): Promise<string> {
    const { contentType, targets, data, autoPublish = false } = params

    // Generate group ID and name
    this.groupCounter++
    const groupId = `group-${uuidv4()}`
    const groupName = `发布 #${this.groupCounter}`

    publishLogger.info(`Creating publish group: ${groupName}`)

    // Create the group
    const group: PublishGroupView = {
      id: groupId,
      name: groupName,
      contentType,
      data,
      status: 'preparing',
      views: new Map(),
      activeAccountId: null,
      createdAt: Date.now(),
      autoPublish,
      autoCloseDelay: 5
    }

    const [width, height] = this.mainWindow.getContentSize()
    const topOffset = TABBAR_HEIGHT
    let temporaryProxySession: Session | null = null

    try {
      // Deduplicate targets by accountId: a publish group cannot have the same
      // account twice, and a duplicate would overwrite group.views and orphan the
      // first view's proxy listener during failure cleanup.
      const seenAccountIds = new Set<string>()
      const uniqueTargets = targets.filter((target) => {
        if (seenAccountIds.has(target.accountId)) {
          return false
        }
        seenAccountIds.add(target.accountId)
        return true
      })

      // Create WebContentsView for each target account
      for (const target of uniqueTargets) {
        const { accountId, platform, displayName } = target

        // Get session partition from database
        const account = DatabaseService.getInstance().getAccount(accountId)

        // Try multiple partition formats for backward compatibility
        // Old format: persist:{platform}-{accountId}
        // New format: persist:account-{accountId}
        const newPartition = account?.sessionPartition || `persist:account-${accountId}`
        const oldPartition = `persist:${platform}-${accountId}`

        // Check which partition has cookies (login state)
        // Prioritize new partition, only fall back to old if new has no cookies
        let partition = newPartition
        const newSes = session.fromPartition(newPartition)
        const newCookies = await newSes.cookies.get({})

        if (newCookies.length > 0) {
          publishLogger.info(`Using new partition (${newCookies.length} cookies): ${newPartition}`)
        } else {
          const oldSes = session.fromPartition(oldPartition)
          const oldCookies = await oldSes.cookies.get({})
          if (oldCookies.length > 0) {
            publishLogger.info(`Falling back to old partition (${oldCookies.length} cookies): ${oldPartition}`)
            partition = oldPartition
          } else {
            publishLogger.info(`No cookies in either partition, using new: ${newPartition}`)
          }
        }

        publishLogger.info(`Account ${displayName} using partition: ${partition}`)
        const ses = session.fromPartition(partition)
        hardenSession(ses)
        // local-file:// requests are gated by the capability allowlist in
        // sessionHardening (only app-handed-out paths are servable).
        registerLocalFileProtocol(ses)
        await applyAccountProxy(ses, account)
        await acquireAccountProxyForSession(ses)
        temporaryProxySession = ses

        // Create WebContentsView
        const view = new WebContentsView({
          webPreferences: createThirdPartyContentWebPreferences(ses)
        })
        this.installNavigationGuard(view.webContents, `publish-group:${groupId}:${accountId}`)

        view.setBounds({
          x: 0,
          y: topOffset,
          width: width,
          height: height - topOffset
        })
        this.installThirdPartyWindowOpenHandler(view, ses)
        trackAccountProxyForWebContents(view.webContents)

        // Store in group before loadURL so failure cleanup can release this view.
        group.views.set(accountId, {
          view,
          accountId,
          platform,
          displayName,
          status: 'pending',
          isVisible: false
        })
        await releaseAccountProxyForSession(ses)
        temporaryProxySession = null

        // Capture console output from this view (dev only)
        this.debugAttachConsoleCapture(view.webContents, `group:${displayName}:${platform}`)

        // Navigate to publish URL
        const publishUrl = this.getPublishUrl(platform, contentType)
        publishLogger.info(`Loading ${displayName}: ${publishUrl}`)
        const loadResult = await this.loadURLWithNavigationHandling(
          view.webContents,
          publishUrl,
          `publish-group:${groupId}:${accountId}:open`
        )
        this.throwIfPublishNavigationFailed(loadResult, '打开账号发布页面')
      }

      // Set first account as active
      if (uniqueTargets.length > 0) {
        group.activeAccountId = uniqueTargets[0].accountId
      }

      // Store the group
      this.publishGroups.set(groupId, group)

      // Show the group
      await this.showPublishGroup(groupId)
    } catch (error) {
      if (this.publishGroups.get(groupId) === group) {
        this.publishGroups.delete(groupId)
      }
      if (this.activeGroupId === groupId) {
        this.activeGroupId = null
      }
      if (temporaryProxySession) {
        await releaseAccountProxyForSession(temporaryProxySession)
        temporaryProxySession = null
      }
      await this.destroyPublishGroupViews(group)
      throw error
    }

    // 自动执行填充 — 每个目标在 fillSingleGroupTarget 里各自等待页面就绪，
    // 这里只需让 createPublishGroup 先返回 groupId 再开始跑
    setTimeout(async () => {
      if (this.publishGroups.get(groupId) !== group) return

      try {
        publishLogger.info(`Auto-filling content for group: ${groupName}`)
        const fillResults = await this.fillGroupContent(groupId)

        // 自动发布：提交所有已就绪的目标；失败/跳过的留在进度卡里供重试，
        // 不再因为单个失败而拦下整组
        if (group.autoPublish) {
          const readyCount = Array.from(group.views.values()).filter(
            (t) => t.status === 'ready'
          ).length
          if (readyCount > 0) {
            const skipAdapterSubmitFor = new Set(
              Array.from(fillResults.entries())
                .filter(([, result]) => result.handled && result.ok && result.skipAdapterSubmit)
                .map(([accountId]) => accountId)
            )
            publishLogger.info(`Auto-publishing group: ${groupName} (${readyCount} ready)`)
            await this.submitGroupAll(groupId, { skipAdapterSubmitFor })
          } else {
            publishLogger.info(`No ready targets, skipping auto-publish for group: ${groupName}`)
            this.emitGroupRunFinished(groupId)
          }
          // Auto-close only a fully successful run; partial results must stay
          // visible so the user can retry or inspect failures.
          const allSuccess = Array.from(group.views.values()).every((t) => t.status === 'success')
          if (allSuccess) {
            this.startAutoCloseCountdown(groupId)
          }
        }
      } catch (error) {
        publishLogger.error(`Auto-fill failed for group ${groupId}:`, error)
      }
    }, 0)

    return groupId
  }

  /**
   * Show a publish group (switch to it in the tab bar)
   */
  async showPublishGroup(groupId: string): Promise<void> {
    const group = this.publishGroups.get(groupId)
    if (!group) return

    // Hide web dashboard, platform and executor views
    if (this.webDashboardView) {
      this.mainWindow.contentView.removeChildView(this.webDashboardView)
    }
    this.hideAuxiliarySurfaces()

    // Hide all other views
    for (const managed of this.views.values()) {
      if (managed.isVisible) {
        this.mainWindow.contentView.removeChildView(managed.view)
        managed.isVisible = false
      }
    }

    // Hide all other groups
    for (const [id, g] of this.publishGroups) {
      if (id !== groupId) {
        for (const target of g.views.values()) {
          if (target.isVisible) {
            this.mainWindow.contentView.removeChildView(target.view)
            target.isVisible = false
          }
        }
      }
    }

    // Show active view in this group
    if (group.activeAccountId) {
      const target = group.views.get(group.activeAccountId)
      if (target) {
        this.mainWindow.contentView.addChildView(target.view)
        target.isVisible = true
      }
    }

    // Ensure tab bar stays on top
    if (this.tabBarView) {
      this.raiseTopSurfaces()
    }

    this.activeGroupId = groupId
    this.activeViewId = null

    // Update bounds for two-layer tab bar
    this.updateAllViewBounds()

    this.notifyTabsChanged()
    this.notifyGroupTabsChanged(groupId)
  }

  /**
   * Switch to a specific tab within a publish group
   */
  async switchGroupTab(groupId: string, accountId: string): Promise<void> {
    const group = this.publishGroups.get(groupId)
    if (!group) return

    const target = group.views.get(accountId)
    if (!target) return

    // Hide current active view
    if (group.activeAccountId && group.activeAccountId !== accountId) {
      const currentTarget = group.views.get(group.activeAccountId)
      if (currentTarget && currentTarget.isVisible) {
        this.mainWindow.contentView.removeChildView(currentTarget.view)
        currentTarget.isVisible = false
      }
    }

    // Show new active view
    this.mainWindow.contentView.addChildView(target.view)
    target.isVisible = true

    // Ensure tab bar stays on top
    if (this.tabBarView) {
      this.raiseTopSurfaces()
    }

    group.activeAccountId = accountId

    this.notifyGroupTabsChanged(groupId)
  }

  /**
   * Close a single tab within a publish group
   */
  async closeGroupTab(groupId: string, accountId: string): Promise<void> {
    const group = this.publishGroups.get(groupId)
    if (!group) return

    const target = group.views.get(accountId)
    if (!target) return

    // Mark cancelled first so any in-flight fill/wait loop on this target
    // bails out instead of polling a destroyed view until timeout
    if (!this.isTerminalTargetStatus(target.status)) {
      this.setGroupTargetStatus(groupId, accountId, 'cancelled')
    }

    // Remove from window if visible
    if (target.isVisible) {
      this.mainWindow.contentView.removeChildView(target.view)
    }

    // Destroy the view
    await releaseAccountProxyForWebContents(target.view.webContents)
    target.view.webContents.close()
    group.views.delete(accountId)

    // If this was the active tab, switch to another
    if (group.activeAccountId === accountId) {
      const remainingIds = Array.from(group.views.keys())
      if (remainingIds.length > 0) {
        await this.switchGroupTab(groupId, remainingIds[0])
      } else {
        group.activeAccountId = null
      }
    }

    // If no more tabs, close the entire group
    if (group.views.size === 0) {
      await this.closePublishGroup(groupId)
    } else {
      this.notifyGroupTabsChanged(groupId)
    }
  }

  /**
   * Close an entire publish group
   */
  async closePublishGroup(groupId: string): Promise<void> {
    const group = this.publishGroups.get(groupId)
    if (!group) return

    this.rememberPublishSnapshot(this.buildGroupStatusSnapshot(group))

    // Remove all views
    for (const target of group.views.values()) {
      if (target.isVisible) {
        this.mainWindow.contentView.removeChildView(target.view)
      }
      await releaseAccountProxyForWebContents(target.view.webContents)
      target.view.webContents.close()
    }

    // Delete the group
    this.publishGroups.delete(groupId)
    this.clearRunMarkers(groupId)

    // If this was the active group, switch to home
    if (this.activeGroupId === groupId) {
      this.activeGroupId = null
      await this.switchToHome()
    }

    this.notifyTabsChanged()
  }

  /**
   * Auto-close a publish group after a delay (used when autoPublish is enabled)
   */
  private startAutoCloseCountdown(groupId: string): void {
    const group = this.publishGroups.get(groupId)
    if (!group) return

    const delaySec = group.autoCloseDelay
    publishLogger.info(`Auto-close countdown: ${delaySec}s for group ${groupId}`)

    this.notifyGroupTabsChanged(groupId)

    setTimeout(async () => {
      try {
        await this.closePublishGroup(groupId)
        publishLogger.info(`Auto-closed group ${groupId}`)
      } catch (error) {
        publishLogger.error(`Auto-close failed for group ${groupId}:`, error)
      }
    }, delaySec * 1000)
  }

  /**
   * Get tabs within a publish group
   */
  getGroupTabs(groupId: string): GroupTab[] {
    const group = this.publishGroups.get(groupId)
    if (!group) return []

    const tabs: GroupTab[] = []
    for (const [accountId, target] of group.views) {
      tabs.push({
        id: accountId,
        groupId,
        platform: target.platform,
        displayName: target.displayName,
        status: target.status,
        isActive: group.activeAccountId === accountId,
        step: target.currentStep,
        error: target.error,
        postUrl: target.postUrl
      })
    }
    return tabs
  }

  /**
   * Get a publish group by ID
   */
  getPublishGroup(groupId: string): PublishGroup | null {
    const group = this.publishGroups.get(groupId)
    if (!group) return null

    return {
      id: group.id,
      name: group.name,
      contentType: group.contentType,
      data: group.data,
      status: group.status,
      targets: Array.from(group.views.values()).map((t) => ({
        accountId: t.accountId,
        platform: t.platform,
        displayName: t.displayName,
        status: t.status,
        error: t.error,
        postUrl: t.postUrl,
        extensionKey: t.extensionKey
      })),
      activeAccountId: group.activeAccountId,
      createdAt: group.createdAt
    }
  }

  /**
   * Get all publish groups
   */
  getPublishGroups(): PublishGroup[] {
    return Array.from(this.publishGroups.values()).map((group) => ({
      id: group.id,
      name: group.name,
      contentType: group.contentType,
      data: group.data,
      status: group.status,
      targets: Array.from(group.views.values()).map((t) => ({
        accountId: t.accountId,
        platform: t.platform,
        displayName: t.displayName,
        status: t.status,
        error: t.error,
        postUrl: t.postUrl,
        extensionKey: t.extensionKey
      })),
      activeAccountId: group.activeAccountId,
      createdAt: group.createdAt
    }))
  }

  /**
   * Get active group ID
   */
  getActiveGroupId(): string | null {
    return this.activeGroupId
  }

  /**
   * Normalize content data: convert string file paths to FileData objects with local-file:// URLs.
   * Web side sends images/videos as string[] (file paths), but adapters expect FileData[].
   */
  private normalizeContentData(data: SyncContentData): SyncContentData {
    function getFallbackMimeType(ext: string, fallbackKind: 'image' | 'video' | 'audio' | 'file'): string {
      if (!ext) {
        return 'application/octet-stream'
      }
      if (fallbackKind === 'audio') {
        return `audio/${ext === 'mp3' ? 'mpeg' : ext}`
      }
      if (fallbackKind === 'image') {
        return `image/${ext}`
      }
      if (fallbackKind === 'video') {
        return `video/${ext}`
      }
      return 'application/octet-stream'
    }

    function toFileData(item: string | { url: string; name: string; type?: string }, fallbackKind: 'image' | 'video' | 'audio' | 'file' = 'file'): {
      url: string
      name: string
      type: string
    } {
      if (typeof item === 'string') {
        // Convert file path to local-file:// URL
        const name = basename(item)
        const ext = extname(item).slice(1).toLowerCase()
        const type = getMimeType(item) || getFallbackMimeType(ext, fallbackKind)
        // Standard scheme URL: local-file:// + path (Chromium treats first segment as host)
        // e.g. /tmp/photo.png -> local-file://tmp/photo.png (host=tmp, path=/photo.png)
        // The protocol handler reconstructs: '/' + host + pathname = /tmp/photo.png
        allowLocalFile(item)
        return { url: createLocalFileUrl(item), name, type }
      }
      // Publishing is user-initiated: the files referenced by the payload are
      // legitimately shared with the platform views.
      if (item.url.startsWith('local-file://')) {
        allowLocalFileUrl(item.url)
      }
      return { url: item.url, name: item.name, type: item.type || 'application/octet-stream' }
    }

    // Existing FileData objects skip toFileData, so their local-file:// URLs
    // must still be allowlisted here or fill scripts would get a 403.
    const registerExisting = <T extends { url?: string }>(fileData: T): T => {
      if (fileData.url?.startsWith('local-file://')) {
        allowLocalFileUrl(fileData.url)
      }
      return fileData
    }

    const normalized = { ...data }

    if ('images' in normalized && Array.isArray(normalized.images)) {
      normalized.images = normalized.images.map((item) => toFileData(item, 'image'))
    }
    if ('videos' in normalized && Array.isArray(normalized.videos)) {
      normalized.videos = normalized.videos.map((item) => toFileData(item, 'video'))
    }
    if ('video' in normalized && normalized.video) {
      normalized.video =
        typeof normalized.video === 'string'
          ? toFileData(normalized.video, 'video')
          : registerExisting(normalized.video)
    }
    if ('cover' in normalized && normalized.cover) {
      normalized.cover =
        typeof normalized.cover === 'string'
          ? toFileData(normalized.cover, 'image')
          : registerExisting(normalized.cover)
    }
    if ('horizontalCover' in normalized && normalized.horizontalCover) {
      normalized.horizontalCover =
        typeof normalized.horizontalCover === 'string'
          ? toFileData(normalized.horizontalCover, 'image')
          : registerExisting(normalized.horizontalCover)
    }
    if ('verticalCover' in normalized && normalized.verticalCover) {
      normalized.verticalCover =
        typeof normalized.verticalCover === 'string'
          ? toFileData(normalized.verticalCover, 'image')
          : registerExisting(normalized.verticalCover)
    }
    if ('audio' in normalized && normalized.audio) {
      normalized.audio =
        typeof normalized.audio === 'string'
          ? toFileData(normalized.audio, 'audio')
          : registerExisting(normalized.audio)
    }

    return normalized
  }

  async fillGroupContent(groupId: string): Promise<GroupFillResults> {
    const group = this.publishGroups.get(groupId)
    if (!group) {
      throw new Error(`Publish group not found: ${groupId}`)
    }

    const fillResults: GroupFillResults = new Map()
    group.status = 'publishing'

    // Normalize data once (convert string paths to local-file:// URLs)
    const normalizedData = this.normalizeContentData(group.data)

    for (const accountId of group.views.keys()) {
      const result = await this.fillSingleGroupTarget(groupId, accountId, normalizedData)
      if (result) {
        fillResults.set(accountId, result)
      }
    }

    this.emitGroupRunFinished(groupId)
    return fillResults
  }

  /**
   * Fill one target: wait for its page (60s cap), inject the fill script and
   * report each step so the progress UI shows what is happening. Returns the
   * extension fill result when the injector path handled the platform.
   */
  private async fillSingleGroupTarget(
    groupId: string,
    accountId: string,
    normalizedData: SyncContentData
  ): Promise<ExtensionFillResult | null> {
    const group = this.publishGroups.get(groupId)
    const target = group?.views.get(accountId)
    if (!group || !target) return null

    // Both whole-run cancel and single-target skip funnel through here
    const isCancelled = (): boolean =>
      this.cancelledPublishIds.has(groupId) || target.status === 'cancelled'

    try {
      if (isCancelled()) {
        if (target.status !== 'success' && target.status !== 'failed') {
          this.setGroupTargetStatus(groupId, accountId, 'cancelled')
        }
        return null
      }

      this.setGroupTargetStatus(groupId, accountId, 'filling')
      this.setGroupTargetStep(groupId, accountId, '等待页面加载…')

      const readiness = await this.waitForPageReady(target.view.webContents, { isCancelled })
      if (readiness === 'cancelled' || isCancelled()) {
        this.setGroupTargetStatus(groupId, accountId, 'cancelled')
        return null
      }
      if (readiness === 'timeout') {
        throw new Error(`页面加载超时（${Math.round(PAGE_READY_TIMEOUT_MS / 1000)} 秒），可重试或跳过该账号`)
      }

      const extensionInjectUrl = getExtensionInjectUrl(target.platform, group.contentType)
      if (extensionInjectUrl) {
        this.setGroupTargetStep(groupId, accountId, '打开发布页面…')
        await this.loadExactUrlIfNeeded(target.view.webContents, extensionInjectUrl)
      }

      if (isCancelled()) {
        this.setGroupTargetStatus(groupId, accountId, 'cancelled')
        return null
      }

      this.setGroupTargetStep(groupId, accountId, '填充内容…')
      const extensionResult = await executeExtensionFill(
        target.view.webContents,
        target.platform,
        group.contentType,
        normalizedData,
        group.autoPublish
      )
      if (isCancelled()) {
        this.setGroupTargetStatus(groupId, accountId, 'cancelled')
        return extensionResult.handled ? extensionResult : null
      }
      if (extensionResult.handled) {
        if (!extensionResult.ok) {
          throw new Error(extensionResult.error || '扩展发布脚本执行失败')
        }
        // TODO(future): plug in real publish confirmation once injectors report that the post went live.
        this.setGroupTargetStatus(groupId, accountId, 'ready', {
          extensionKey: extensionResult.extensionKey
        })
        publishLogger.info(`Filled content for ${target.displayName} via extension injector`)
        return extensionResult
      }

      const adapter = getAdapter(target.platform, group.contentType)
      if (!adapter) {
        const error = `No adapter found for platform: ${target.platform}`
        this.setGroupTargetStatus(groupId, accountId, 'failed', { error })
        publishLogger.error(error)
        return null
      }

      const fillScript = adapter.getFillScript(group.contentType, normalizedData)
      await target.view.webContents.executeJavaScript(fillScript)
      if (isCancelled()) {
        this.setGroupTargetStatus(groupId, accountId, 'cancelled')
        return null
      }

      this.setGroupTargetStatus(groupId, accountId, 'ready')
      publishLogger.info(`Filled content for ${target.displayName}`)
      return null
    } catch (error) {
      if (isCancelled()) {
        this.setGroupTargetStatus(groupId, accountId, 'cancelled')
      } else {
        this.setGroupTargetStatus(groupId, accountId, 'failed', {
          error: this.formatPublishError(error)
        })
      }
      publishLogger.error(`Failed to fill content for ${accountId}:`, error)
      return null
    }
  }

  /**
   * Skip one target: marks it cancelled so in-flight waits/steps bail out and
   * the run proceeds to the next account.
   */
  skipGroupTarget(groupId: string, accountId: string): void {
    const group = this.publishGroups.get(groupId)
    const target = group?.views.get(accountId)
    if (!group || !target) return
    if (this.isTerminalTargetStatus(target.status)) return

    this.setGroupTargetStatus(groupId, accountId, 'cancelled')
    this.emitGroupRunFinished(groupId)
  }

  /**
   * Retry one finished (failed/cancelled) target: reload its page fresh, then
   * re-run fill — and submit when the group was started with auto-publish.
   */
  async retryGroupTarget(groupId: string, accountId: string): Promise<void> {
    const group = this.publishGroups.get(groupId)
    if (!group) {
      throw new Error(`Publish group not found: ${groupId}`)
    }
    const target = group.views.get(accountId)
    if (!target) {
      throw new Error(`Target not found in group: ${accountId}`)
    }
    if (!this.isTerminalTargetStatus(target.status)) return

    // A retry starts a fresh result for this group: let the finish
    // notification and summary fire again once everything settles.
    this.cancelledPublishIds.delete(groupId)
    this.notifiedGroupIds.delete(groupId)
    this.summaryEmittedGroupIds.delete(groupId)

    target.error = undefined
    target.postUrl = undefined
    this.setGroupTargetStatus(groupId, accountId, 'pending')
    this.setGroupTargetStep(groupId, accountId, '重新打开页面…')

    const publishUrl = this.getPublishUrl(target.platform, group.contentType)
    const loadResult = await this.loadURLWithNavigationHandling(
      target.view.webContents,
      publishUrl,
      `publish-group:${groupId}:${accountId}:retry`
    )
    if (loadResult.kind === 'network') {
      this.setGroupTargetStatus(groupId, accountId, 'failed', {
        error: `重新打开发布页面失败：${loadResult.message || '网络连接失败'}`
      })
      this.emitGroupRunFinished(groupId)
      return
    }

    const normalizedData = this.normalizeContentData(group.data)
    const result = await this.fillSingleGroupTarget(groupId, accountId, normalizedData)

    if (group.autoPublish && target.status === 'ready') {
      const skipAdapterSubmit =
        result?.handled === true && result.ok && result.skipAdapterSubmit === true
      await this.submitGroupTarget(groupId, accountId, { skipAdapterSubmit })
    } else {
      this.emitGroupRunFinished(groupId)
    }
  }

  /**
   * Submit content for a single target in a publish group
   */
  async submitGroupTarget(
    groupId: string,
    accountId: string,
    options: { skipAdapterSubmit?: boolean; suppressFinishEvent?: boolean } = {}
  ): Promise<void> {
    const group = this.publishGroups.get(groupId)
    if (!group) {
      throw new Error(`Publish group not found: ${groupId}`)
    }

    const target = group.views.get(accountId)
    if (!target) {
      throw new Error(`Target not found in group: ${accountId}`)
    }

    if (options.skipAdapterSubmit) {
      // TODO(future): plug in real publish confirmation once extension injectors report live-post success.
      this.setGroupTargetStatus(groupId, accountId, 'ready')
      return
    }

    // Skipped targets stay cancelled; don't resurrect them at submit time
    if (target.status === 'cancelled') {
      return
    }

    try {
      if (this.cancelledPublishIds.has(groupId)) {
        this.setGroupTargetStatus(groupId, accountId, 'cancelled')
        throw new Error('Publish cancelled')
      }

      this.setGroupTargetStep(groupId, accountId, '提交发布…')

      const adapter = getAdapter(target.platform, group.contentType)
      if (!adapter) {
        const entry = getDesktopInjectorManifestEntry(target.platform, group.contentType)
        if (!entry) {
          throw new Error(`No adapter found for platform: ${target.platform}`)
        }
        const extensionResult = await this.submitExtensionBackedContent(
          target.view.webContents,
          entry,
          this.normalizeContentData(group.data)
        )
        if (this.cancelledPublishIds.has(groupId)) {
          this.setGroupTargetStatus(groupId, accountId, 'cancelled')
          throw new Error('Publish cancelled')
        }
        this.setGroupTargetStatus(groupId, accountId, 'success', {
          extensionKey: extensionResult.extensionKey
        })
        return
      }

      const result = await adapter.submit(target.view, group.contentType)
      if (this.cancelledPublishIds.has(groupId)) {
        this.setGroupTargetStatus(groupId, accountId, 'cancelled')
        throw new Error('Publish cancelled')
      }
      if (result.success) {
        this.setGroupTargetStatus(groupId, accountId, 'success', {
          postUrl: result.postUrl
        })
      } else {
        this.setGroupTargetStatus(groupId, accountId, 'failed', {
          error: result.error || '发布失败'
        })
      }
    } catch (error) {
      if (this.cancelledPublishIds.has(groupId)) {
        this.setGroupTargetStatus(groupId, accountId, 'cancelled')
      } else {
        this.setGroupTargetStatus(groupId, accountId, 'failed', {
          error: this.formatPublishError(error)
        })
      }
      throw error
    } finally {
      if (!options.suppressFinishEvent) {
        this.emitGroupRunFinished(groupId)
      }
    }
  }

  /**
   * Submit content for all targets in a publish group
   */
  async submitGroupAll(
    groupId: string,
    options: { skipAdapterSubmitFor?: Set<string> } = {}
  ): Promise<void> {
    const group = this.publishGroups.get(groupId)
    if (!group) {
      throw new Error(`Publish group not found: ${groupId}`)
    }

    for (const accountId of group.views.keys()) {
      try {
        if (this.cancelledPublishIds.has(groupId)) {
          const target = group.views.get(accountId)
          if (target && target.status !== 'success' && target.status !== 'failed') {
            this.setGroupTargetStatus(groupId, accountId, 'cancelled')
          }
          continue
        }
        // Only submit targets that actually reached "ready" — failed fills,
        // skipped targets and already-submitted ones are left alone
        if (group.views.get(accountId)?.status !== 'ready') {
          continue
        }
        await this.submitGroupTarget(groupId, accountId, {
          skipAdapterSubmit: options.skipAdapterSubmitFor?.has(accountId) === true,
          suppressFinishEvent: true
        })
      } catch (error) {
        publishLogger.error(`Failed to submit for ${accountId}:`, error)
      }
    }

    this.emitGroupRunFinished(groupId)
  }

  /**
   * Update the overall status of a publish group
   */
  private updateGroupStatus(groupId: string): void {
    const group = this.publishGroups.get(groupId)
    if (!group) return

    const statuses = Array.from(group.views.values()).map((t) => t.status)

    if (statuses.length === 0) {
      group.status = 'cancelled'
    } else if (statuses.every((s) => s === 'cancelled')) {
      group.status = 'cancelled'
    } else if (statuses.some((s) => s === 'cancelled') && statuses.every((s) => this.isTerminalTargetStatus(s))) {
      group.status = 'cancelled'
    } else if (statuses.every((s) => s === 'success')) {
      group.status = 'completed'
    } else if (statuses.some((s) => s === 'failed') && statuses.every((s) => this.isTerminalTargetStatus(s))) {
      group.status = 'failed'
    } else if (statuses.every((s) => s === 'ready' || s === 'success')) {
      group.status = 'preparing'
    } else if (statuses.some((s) => s === 'filling')) {
      group.status = 'publishing'
    }
  }

  /**
   * Update status of a single target in a publish group
   */
  updateGroupTargetStatus(
    groupId: string,
    accountId: string,
    status: PublishTargetStatus
  ): void {
    const group = this.publishGroups.get(groupId)
    if (!group) return

    const target = group.views.get(accountId)
    if (!target) return

    this.setGroupTargetStatus(groupId, accountId, status)
  }

  // ========== Debug methods (dev only) ==========

  private consoleLogs: Array<{
    timestamp: number
    source: string
    level: string
    message: string
    line: number
    sourceId: string
  }> = []
  private maxLogEntries = 500

  /**
   * Attach console-message listener to a webContents, tagged with a source label.
   */
  debugAttachConsoleCapture(webContents: Electron.WebContents, source: string): void {
    webContents.on('console-message', (_event, level, message, line, sourceId) => {
      const levelMap = ['verbose', 'info', 'warning', 'error']
      this.consoleLogs.push({
        timestamp: Date.now(),
        source,
        level: levelMap[level] || 'unknown',
        message,
        line,
        sourceId
      })
      // Ring buffer
      if (this.consoleLogs.length > this.maxLogEntries) {
        this.consoleLogs.splice(0, this.consoleLogs.length - this.maxLogEntries)
      }
    })
  }

  /**
   * Get captured console logs, optionally filtered by source.
   */
  debugGetLogs(filter?: { source?: string; level?: string; since?: number; limit?: number }): unknown[] {
    let logs = this.consoleLogs
    if (filter?.source) {
      logs = logs.filter((l) => l.source.includes(filter.source!))
    }
    if (filter?.level) {
      logs = logs.filter((l) => l.level === filter.level)
    }
    if (filter?.since) {
      logs = logs.filter((l) => l.timestamp >= filter.since!)
    }
    if (filter?.limit) {
      logs = logs.slice(-filter.limit)
    }
    return logs
  }

  debugClearLogs(): void {
    this.consoleLogs = []
  }

  /**
   * Get debug info about all views and groups
   */
  getDebugInfo(): Record<string, unknown> {
    const views = Array.from(this.views.entries()).map(([id, managed]) => ({
      id,
      accountId: managed.accountId,
      platform: managed.platform,
      url: managed.view.webContents.getURL(),
      title: managed.view.webContents.getTitle()
    }))

    const groups = Array.from(this.publishGroups.entries()).map(([id, group]) => ({
      id,
      name: group.name,
      contentType: group.contentType,
      status: group.status,
      activeAccountId: group.activeAccountId,
      targets: Array.from(group.views.entries()).map(([accountId, target]) => ({
        accountId,
        platform: target.platform,
        displayName: target.displayName,
        status: target.status,
        url: target.view.webContents.getURL()
      }))
    }))

    return {
      homeUrl: this.webDashboardView?.webContents.getURL(),
      views,
      groups,
      tabs: this.getTabs()
    }
  }

  /**
   * Get publish group data (the content data that was sent for publishing)
   */
  debugGetGroupData(groupId: string): Record<string, unknown> | null {
    const group = this.publishGroups.get(groupId)
    if (!group) return null
    return {
      id: group.id,
      name: group.name,
      contentType: group.contentType,
      status: group.status,
      data: group.data,
      normalizedData: this.normalizeContentData(group.data)
    }
  }

  /**
   * Navigate home view to a URL
   */
  async debugNavigate(url: string): Promise<void> {
    if (!this.webDashboardView) throw new Error('Home view not available')
    if (this.blockUnsupportedNavigation(url, 'debugNavigate')) {
      return
    }
    await this.webDashboardView.webContents.loadURL(url)
  }

  /**
   * Get session cookies for a publish group target
   */
  async debugGetCookies(
    groupId: string,
    accountId: string,
    domain?: string
  ): Promise<Electron.Cookie[]> {
    const group = this.publishGroups.get(groupId)
    if (!group) throw new Error(`Group not found: ${groupId}`)
    const target = group.views.get(accountId)
    if (!target) throw new Error(`Target not found: ${accountId}`)
    const ses = target.view.webContents.session
    return domain ? ses.cookies.get({ domain }) : ses.cookies.get({})
  }

  /**
   * Execute script in a view by ID (accountId, '__home__', or '__tabbar__')
   */
  async debugExecScript(viewId: string, script: string): Promise<unknown> {
    if ((viewId === '__home__' || viewId === WEB_TAB_ID) && this.webDashboardView) {
      return this.webDashboardView.webContents.executeJavaScript(script)
    }
    if (viewId === '__tabbar__' && this.tabBarView) {
      return this.tabBarView.webContents.executeJavaScript(script)
    }
    const managed = this.views.get(viewId)
    if (managed) {
      return managed.view.webContents.executeJavaScript(script)
    }
    throw new Error(`View not found: ${viewId}`)
  }

  /**
   * Execute script in a publish group's view
   */
  async debugExecGroupScript(groupId: string, accountId: string, script: string): Promise<unknown> {
    const group = this.publishGroups.get(groupId)
    if (!group) throw new Error(`Group not found: ${groupId}`)
    const target = group.views.get(accountId)
    if (!target) throw new Error(`Target not found in group: ${accountId}`)
    return target.view.webContents.executeJavaScript(script)
  }

  /**
   * Capture screenshot of a publish group's view
   */
  async debugCaptureGroupView(groupId: string, accountId: string): Promise<Electron.NativeImage> {
    const group = this.publishGroups.get(groupId)
    if (!group) throw new Error(`Group not found: ${groupId}`)
    const target = group.views.get(accountId)
    if (!target) throw new Error(`Target not found in group: ${accountId}`)
    return target.view.webContents.capturePage()
  }

  /**
   * Toggle DevTools for a publish group's view
   */
  debugToggleDevTools(groupId: string, accountId: string): void {
    const group = this.publishGroups.get(groupId)
    if (!group) throw new Error(`Group not found: ${groupId}`)
    const target = group.views.get(accountId)
    if (!target) throw new Error(`Target not found: ${accountId}`)
    const wc = target.view.webContents
    if (wc.isDevToolsOpened()) {
      wc.closeDevTools()
    } else {
      wc.openDevTools({ mode: 'detach' })
    }
  }
}
