import { BrowserView, BrowserWindow, session, ipcMain, shell, dialog, net } from 'electron'
import { join, basename, extname } from 'path'
import { v4 as uuidv4 } from 'uuid'
import { is } from '@electron-toolkit/utils'
import {
  createLocalFileUrl,
  type PlatformType,
  type SyncContentType,
  type SyncContentData,
  type BrowserTab,
  type GroupTab,
  type PublishGroupStatus,
  type PublishTargetStatus,
  type PublishGroup
} from '../../shared/types'
import { PLATFORMS, PLATFORM_PUBLISH_URLS } from '../../shared/constants'
import { getAdapter } from '../platforms'
import { FingerprintService } from '../fingerprint'
import { getMimeType } from '../utils/mime'
import { getDesktopRequestHeaders, hardenSession, registerLocalFileProtocol } from './sessionHardening'
import { DatabaseService } from '../database'
import {
  executeExtensionFill,
  getExtensionInjectUrl,
  type ExtensionFillResult
} from '../injectors'

interface ManagedBrowserView {
  view: BrowserView
  accountId: string
  platform: PlatformType
  isVisible: boolean
  title: string
  url: string
  isHome: boolean // 首页 tab 不能关闭
}

// Platform-based views (without accountId)
interface PlatformBrowserView {
  view: BrowserView
  platform: PlatformType
  isVisible: boolean
}

// Executor views (keyed by accountId for multi-account support)
interface ExecutorBrowserView {
  view: BrowserView
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
      view: BrowserView
      accountId: string
      platform: PlatformType
      displayName: string
      status: PublishTargetStatus
      isVisible: boolean
    }
  >
  activeAccountId: string | null
  createdAt: number
  autoPublish: boolean
  autoCloseDelay: number // seconds
}

type GroupFillResults = Map<string, ExtensionFillResult>

// Layout constants
const TABBAR_HEIGHT = 40
const TOOLBAR_HEIGHT = 40
const DEFAULT_SIDEBAR_WIDTH = 256 // 16rem expanded

// Home tab constants - the home tab loads the main web app
const HOME_TAB_ID = '__home__'

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
  private fingerprintService: FingerprintService
  // Home tab BrowserView - loads the main web app
  private homeView: BrowserView | null = null
  // Tab bar BrowserView - always on top
  private tabBarView: BrowserView | null = null
  // Publish Groups - 发布 Group 管理
  private publishGroups: Map<string, PublishGroupView> = new Map()
  private activeGroupId: string | null = null
  private groupCounter: number = 0 // 用于生成 Group 名称
  private fingerprintLegacyReloads = new WeakSet<Electron.WebContents>()

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow
    this.fingerprintService = FingerprintService.getInstance()

    // Listen for window resize/maximize/unmaximize to update all view bounds
    const updateBounds = (): void => {
      this.updateAllViewBounds()
    }
    this.mainWindow.on('resize', updateBounds)
    this.mainWindow.on('maximize', updateBounds)
    this.mainWindow.on('unmaximize', updateBounds)
  }

  private getPlatformFingerprintKey(platform: PlatformType): string {
    return `platform-default-${platform}`
  }

  private async applyFingerprintToView(view: BrowserView, profileKey: string): Promise<void> {
    try {
      console.log('[BrowserViewManager] Applying fingerprint:', profileKey)
      await this.fingerprintService.applyFingerprintToWebContents(view.webContents, profileKey)
      console.log('[BrowserViewManager] Fingerprint applied successfully:', profileKey)
    } catch (error) {
      console.warn('[BrowserViewManager] Fingerprint application failed:', error)
    }
  }

  private async ensureFingerprintForView(
    view: BrowserView,
    profileKey: string,
    opts: { reloadLoadedLegacy?: boolean } = {}
  ): Promise<void> {
    const webContents = view.webContents
    const hadFingerprint = this.fingerprintService.hasFingerprintScript(webContents)
    await this.applyFingerprintToView(view, profileKey)
    const hasFingerprint = this.fingerprintService.hasFingerprintScript(webContents)

    if (
      opts.reloadLoadedLegacy &&
      !hadFingerprint &&
      hasFingerprint &&
      !this.fingerprintLegacyReloads.has(webContents)
    ) {
      this.fingerprintLegacyReloads.add(webContents)
      await this.reloadWebContentsForFingerprint(webContents)
    }
  }

  private async reloadWebContentsForFingerprint(webContents: Electron.WebContents): Promise<void> {
    if (webContents.isDestroyed()) {
      return
    }

    const currentUrl = webContents.getURL()
    if (!currentUrl || currentUrl === 'about:blank') {
      return
    }

    await new Promise<void>((resolve) => {
      let settled = false
      const finish = (): void => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        webContents.removeListener('did-finish-load', finish)
        webContents.removeListener('did-fail-load', finish)
        resolve()
      }

      const timeout = setTimeout(finish, 15_000)
      webContents.once('did-finish-load', finish)
      webContents.once('did-fail-load', finish)
      webContents.reload()
    })
  }

  /**
   * Initialize the home tab and tab bar
   * Called after main window is ready
   */
  async initializeHomeTab(): Promise<void> {
    if (this.homeView) return

    const [width, height] = this.mainWindow.getContentSize()

    // 1. Create tab bar BrowserView first
    this.tabBarView = new BrowserView({
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    })
    this.tabBarView.setBounds({
      x: 0,
      y: 0,
      width: width,
      height: TABBAR_HEIGHT
    })
    this.mainWindow.addBrowserView(this.tabBarView)

    // Load tab bar renderer
    const isDev = !!(process.env.ELECTRON_RENDERER_URL)
    if (isDev) {
      await this.tabBarView.webContents.loadURL(process.env.ELECTRON_RENDERER_URL!)
    } else {
      await this.tabBarView.webContents.loadFile(join(__dirname, '../renderer/index.html'))
    }
    console.log('[BrowserViewManager] Tab bar view created')

    // 2. Create home content BrowserView
    this.homeView = new BrowserView({
      webPreferences: {
        preload: join(__dirname, '../preload/webview.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        webSecurity: true
      }
    })
    this.homeView.setBounds({
      x: 0,
      y: TABBAR_HEIGHT,
      width: width,
      height: height - TABBAR_HEIGHT
    })
    this.mainWindow.addBrowserView(this.homeView)

    // 3. Ensure tab bar is always on top
    this.mainWindow.setTopBrowserView(this.tabBarView)

    // Load home URL
    const homeUrl = is.dev
      ? `${process.env.MULTIPOST_WEB_URL || 'http://localhost:3000'}/dashboard`
      : 'https://multipost.app/dashboard'

    // Handle new window requests (e.g. auth callback, target="_blank" links)
    // Keep same-origin navigation inside homeView, open external links in system browser
    const allowedHosts = ['multipost.app', 'localhost']
    this.homeView.webContents.setWindowOpenHandler(({ url }) => {
      try {
        const urlObj = new URL(url)
        const isSameOrigin = allowedHosts.some(
          (host) => urlObj.hostname === host || urlObj.hostname.endsWith(`.${host}`)
        )
        if (isSameOrigin) {
          // Navigate homeView to the URL instead of opening a new window
          this.homeView?.webContents.loadURL(url)
          return { action: 'deny' }
        }
      } catch {
        // invalid URL
      }
      shell.openExternal(url)
      return { action: 'deny' }
    })

    console.log('[BrowserViewManager] Loading home tab:', homeUrl)
    await this.homeView.webContents.loadURL(homeUrl)

    // Set as active
    this.activeViewId = HOME_TAB_ID

    // Notify tabs changed
    this.notifyTabsChanged()

    // Setup navigation events for home view
    this.homeView.webContents.on('page-title-updated', () => {
      this.notifyTabsChanged()
    })

    // Setup IPC handlers for home view navigation
    this.setupHomeViewIpcHandlers()

    // Capture console output from home view (dev only)
    this.debugAttachConsoleCapture(this.homeView.webContents, 'home')

    console.log('[BrowserViewManager] Home tab initialized')
  }

  /**
   * Setup IPC handlers for home view (navigation, file dialogs, etc.)
   */
  private setupHomeViewIpcHandlers(): void {
    // 导航请求 - 在 homeView 中导航
    ipcMain.on('multipost:navigation:navigateTo', (_, path: string) => {
      if (!this.homeView) return
      const baseUrl = is.dev
        ? (process.env.MULTIPOST_WEB_URL || 'http://localhost:3000')
        : 'https://multipost.app'
      const fullPath = path.startsWith('/dashboard') ? path : `/dashboard${path}`
      const url = `${baseUrl}${fullPath}`
      this.homeView.webContents.loadURL(url)
    })

    // 导航报告
    ipcMain.on('multipost:navigation:reportPath', (_, path: string) => {
      this.mainWindow.webContents.send('webview:path-changed', path)
    })

    // 显示/隐藏 homeView
    ipcMain.on('multipost:webview:show', () => {
      this.switchToHome()
    })

    ipcMain.on('multipost:webview:hide', () => {
      if (this.homeView) {
        this.mainWindow.removeBrowserView(this.homeView)
      }
    })

    // 打开外部链接
    ipcMain.handle('multipost:app:openExternal', async (_, url: string) => {
      await shell.openExternal(url)
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
  getHomeView(): BrowserView | null {
    return this.homeView
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
   * Create or get a BrowserView for an account
   */
  async openView(accountId: string, platform: PlatformType, url?: string): Promise<BrowserView> {
    console.log('[BrowserViewManager] openView called:', { accountId, platform, url })

    // Check if view already exists
    const existing = this.views.get(accountId)
    if (existing) {
      console.log('[BrowserViewManager] View exists, showing it')
      await this.showView(accountId)
      if (url) {
        await this.ensureFingerprintForView(existing.view, accountId)
        await this.navigate(accountId, url)
      } else {
        await this.ensureFingerprintForView(existing.view, accountId, { reloadLoadedLegacy: true })
      }
      return existing.view
    }

    console.log('[BrowserViewManager] Creating new view')
    // Get session partition from account database for session isolation
    // This ensures login state is preserved across different features
    const account = DatabaseService.getInstance().getAccount(accountId)
    const partition = account?.sessionPartition || `persist:account-${accountId}`
    console.log('[BrowserViewManager] Using session partition:', partition)
    const ses = session.fromPartition(partition)
    hardenSession(ses)

    // Create BrowserView with isolated session
    const view = new BrowserView({
      webPreferences: {
        // Security: third-party platform pages get NO app preload — do not expose
        // window.api / window.electron (raw ipcRenderer) to untrusted remote content.
        session: ses,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    })

    // Set bounds (full width, only reserve space for tab bar)
    // MainWebView is hidden when BrowserView is shown, so no sidebar offset needed
    // Use getContentSize() instead of getBounds() for correct dimensions
    const [width, height] = this.mainWindow.getContentSize()
    const topOffset = TABBAR_HEIGHT
    console.log('[BrowserViewManager] Setting bounds:', { x: 0, y: topOffset, width, height: height - topOffset })
    view.setBounds({
      x: 0,
      y: topOffset,
      width: width,
      height: height - topOffset
    })
    // Disable auto-resize, we manage bounds manually via resize listener
    view.setAutoResize({ width: false, height: false })
    console.log('[BrowserViewManager] View created with bounds offset y:', topOffset)

    // Apply fingerprint before loading any content.
    await this.ensureFingerprintForView(view, accountId)

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

    // Hide home view when showing other BrowserView
    if (this.homeView) {
      this.mainWindow.removeBrowserView(this.homeView)
    }

    // Hide all other content views
    for (const managed of this.views.values()) {
      if (managed.isVisible) {
        this.mainWindow.removeBrowserView(managed.view)
        managed.isVisible = false
      }
    }

    // Add new view to window
    this.mainWindow.addBrowserView(view)
    console.log('[BrowserViewManager] Added new BrowserView')

    // Ensure tab bar stays on top
    if (this.tabBarView) {
      this.mainWindow.setTopBrowserView(this.tabBarView)
    }

    // Hide other views
    this.hideAllExcept(accountId)
    this.activeViewId = accountId

    // Navigate to URL
    console.log('[BrowserViewManager] Loading URL:', targetUrl)
    await view.webContents.loadURL(targetUrl)
    console.log('[BrowserViewManager] URL loaded successfully')

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
    console.log('[BrowserViewManager] Tabs changed notification sent')

    return view
  }

  /**
   * Close and remove a BrowserView
   */
  async closeView(accountId: string): Promise<void> {
    const managed = this.views.get(accountId)
    if (!managed) return

    this.mainWindow.removeBrowserView(managed.view)
    // Destroy the webContents
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
   * Show a specific BrowserView
   */
  async showView(accountId: string): Promise<void> {
    const managed = this.views.get(accountId)
    if (!managed) return

    // Hide home view
    if (this.homeView) {
      this.mainWindow.removeBrowserView(this.homeView)
    }

    this.hideAllExcept(accountId)
    this.mainWindow.addBrowserView(managed.view)
    managed.isVisible = true
    this.activeViewId = accountId

    // Ensure tab bar stays on top
    if (this.tabBarView) {
      this.mainWindow.setTopBrowserView(this.tabBarView)
    }

    this.notifyTabsChanged()
  }

  /**
   * Hide a specific BrowserView
   */
  async hideView(accountId: string): Promise<void> {
    const managed = this.views.get(accountId)
    if (!managed) return

    this.mainWindow.removeBrowserView(managed.view)
    managed.isVisible = false

    if (this.activeViewId === accountId) {
      this.activeViewId = null
    }
  }

  /**
   * Hide all views except the specified one
   */
  private hideAllExcept(accountId: string): void {
    for (const [id, managed] of this.views) {
      if (id !== accountId && managed.isVisible) {
        this.mainWindow.removeBrowserView(managed.view)
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
    await managed.view.webContents.loadURL(url)
  }

  /**
   * Execute JavaScript in the BrowserView
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
   * Requires the BrowserView to be open and loaded for the account
   */
  async fetchUserInfo(
    accountId: string,
    platform: PlatformType
  ): Promise<{ username: string; displayName?: string; avatar?: string } | null> {
    // Try using the open BrowserView first
    const managed = this.views.get(accountId)
    if (managed) {
      const adapter = getAdapter(platform)
      if (adapter) {
        console.log('[BrowserViewManager] fetchUserInfo: using view for', platform)
        const result = await adapter.getUserInfo(managed.view)
        console.log('[BrowserViewManager] fetchUserInfo result:', result)
        return result
      }
    }

    // Fallback: fetch user info directly from session cookies (no view needed)
    console.log('[BrowserViewManager] fetchUserInfo: no view, using session cookies for', platform)
    return this.fetchUserInfoFromSession(accountId, platform)
  }

  /**
   * Fetch user info directly using session cookies without needing a BrowserView
   */
  private async fetchUserInfoFromSession(
    accountId: string,
    platform: PlatformType
  ): Promise<{ username: string; displayName?: string; avatar?: string } | null> {
    try {
      const account = DatabaseService.getInstance().getAccount(accountId)
      const partition = account?.sessionPartition || `persist:account-${accountId}`
      const ses = session.fromPartition(partition)
      hardenSession(ses)

      if (platform === 'bilibili') {
        const cookies = await ses.cookies.get({ domain: '.bilibili.com' })
        const sessdata = cookies.find((c) => c.name === 'SESSDATA')
        if (!sessdata) return null

        const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
        const response = await net.fetch('https://api.bilibili.com/x/web-interface/nav', {
          headers: getDesktopRequestHeaders({
            Cookie: cookieHeader,
            Referer: 'https://www.bilibili.com/'
          })
        })
        const data = await response.json()

        if (data.data?.isLogin) {
          const result = {
            username: String(data.data.mid),
            displayName: data.data.uname,
            avatar: data.data.face
          }
          console.log('[BrowserViewManager] fetchUserInfoFromSession result:', result)
          return result
        }
      }

      if (platform === 'xiaohongshu') {
        const cookies = await ses.cookies.get({ domain: '.xiaohongshu.com' })
        const webSession = cookies.find((c) => c.name === 'web_session')
        if (!webSession) return null

        const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
        const response = await net.fetch('https://edith.xiaohongshu.com/api/sns/web/v2/user/me', {
          headers: getDesktopRequestHeaders({
            Cookie: cookieHeader,
            Origin: 'https://www.xiaohongshu.com',
            Referer: 'https://www.xiaohongshu.com/'
          })
        })
        const data = await response.json()

        if (data.data?.nickname) {
          const result = {
            username: data.data.red_id || data.data.nickname,
            displayName: data.data.nickname,
            avatar: data.data.imageb
          }
          console.log('[BrowserViewManager] fetchUserInfoFromSession xiaohongshu result:', result)
          return result
        }
      }

      // TODO: Add session-based user info fetch for other platforms
      return null
    } catch (e) {
      console.error('[BrowserViewManager] fetchUserInfoFromSession error:', e)
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

    console.log(`[getLoginStatus] Checking ${platform} account ${accountId}`)
    console.log(`[getLoginStatus] New partition: ${newPartition}`)
    console.log(`[getLoginStatus] Old partition: ${oldPartition}`)

    // Check new partition first
    let ses = session.fromPartition(newPartition)
    let cookies = await ses.cookies.get({})
    console.log(`[getLoginStatus] Cookies in new partition: ${cookies.length}`)

    // If no cookies in new partition, try old partition
    if (cookies.length === 0) {
      ses = session.fromPartition(oldPartition)
      cookies = await ses.cookies.get({})
      console.log(`[getLoginStatus] Cookies in old partition: ${cookies.length}`)
    }

    // Debug: show relevant cookies for bilibili
    if (platform === 'bilibili') {
      const sessdata = cookies.find(c => c.name === 'SESSDATA')
      console.log(`[getLoginStatus] SESSDATA cookie:`, sessdata ? 'found' : 'not found')
      if (sessdata) {
        console.log(`[getLoginStatus] SESSDATA domain:`, sessdata.domain)
      }
      // Show all bilibili cookies
      const biliCookies = cookies.filter(c => c.domain?.includes('bilibili'))
      console.log(`[getLoginStatus] Bilibili cookies:`, biliCookies.map(c => c.name))
    }

    // Platform-specific login detection
    switch (platform) {
      case 'weibo':
        return cookies.some((c) => c.name === 'SUB' && c.domain?.includes('weibo.com'))
      case 'xiaohongshu':
        return cookies.some((c) => c.name === 'web_session' && c.domain?.includes('xiaohongshu.com'))
      case 'twitter':
        return cookies.some((c) => c.name === 'auth_token' && c.domain?.includes('twitter.com'))
      case 'bilibili':
        return cookies.some((c) => c.name === 'SESSDATA' && c.domain?.includes('bilibili.com'))
      case 'zhihu':
        return cookies.some((c) => c.name === 'z_c0' && c.domain?.includes('zhihu.com'))
      case 'zsxq':
        return cookies.some((c) => c.name === 'zsxq_access_token' && c.domain?.includes('zsxq.com'))
      default:
        return cookies.length > 0
    }
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

  /**
   * Update bounds for all views (called on window resize or sidebar state change)
   */
  updateBounds(): void {
    this.updateAllViewBounds()
  }

  /**
   * Update bounds for all views based on current window size
   * All BrowserViews start below the single-row tab bar (40px)
   */
  private updateAllViewBounds(): void {
    if (this.mainWindow.isDestroyed()) return

    const [width, height] = this.mainWindow.getContentSize()

    // Update tab bar view
    if (this.tabBarView) {
      this.tabBarView.setBounds({
        x: 0,
        y: 0,
        width: width,
        height: TABBAR_HEIGHT
      })
      // Ensure tab bar stays on top
      this.mainWindow.setTopBrowserView(this.tabBarView)
    }

    // All content views start below the tab bar
    const contentTop = TABBAR_HEIGHT
    const contentHeight = height - TABBAR_HEIGHT

    // Update home view
    if (this.homeView) {
      this.homeView.setBounds({
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
  }

  // ============================================
  // Platform-based methods (without accountId)
  // ============================================

  /**
   * Open or get a BrowserView for a platform (without account binding)
   * Session partition: persist:{platform}-default
   */
  async openPlatformView(
    platform: PlatformType,
    contentType?: SyncContentType,
    url?: string
  ): Promise<BrowserView> {
    // Check if view already exists
    const existing = this.platformViews.get(platform)
    if (existing) {
      await this.showPlatformView(platform)
      // Navigate to appropriate URL for content type
      const targetUrl = url || this.getPublishUrl(platform, contentType)
      if (targetUrl) {
        await this.ensureFingerprintForView(existing.view, this.getPlatformFingerprintKey(platform))
        await this.navigatePlatform(platform, targetUrl)
      } else {
        await this.ensureFingerprintForView(existing.view, this.getPlatformFingerprintKey(platform), {
          reloadLoadedLegacy: true
        })
      }
      return existing.view
    }

    // Create partition for session isolation (shared for the platform)
    const partition = `persist:${platform}-default`
    const ses = session.fromPartition(partition)
    hardenSession(ses)

    // Create BrowserView with isolated session
    const view = new BrowserView({
      webPreferences: {
        // Security: third-party platform pages get NO app preload — do not expose
        // window.api / window.electron (raw ipcRenderer) to untrusted remote content.
        session: ses,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    })

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
    view.setAutoResize({ width: false, height: false })

    await this.ensureFingerprintForView(view, this.getPlatformFingerprintKey(platform))

    // Store the managed view (not visible initially)
    this.platformViews.set(platform, {
      view,
      platform,
      isVisible: false
    })

    // Navigate to URL based on content type (load in background)
    const targetUrl = url || this.getPublishUrl(platform, contentType)
    await view.webContents.loadURL(targetUrl)

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
    const adapter = getAdapter(platform)
    return adapter?.publishUrl || PLATFORMS[platform]?.url || 'about:blank'
  }

  private normalizeNavigationUrl(url: string): string {
    try {
      const normalized = new URL(url)
      normalized.hash = ''
      return normalized.toString()
    } catch {
      return url.trim()
    }
  }

  private async waitForNavigationSettle(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  private async loadExactUrlIfNeeded(webContents: Electron.WebContents, targetUrl: string): Promise<void> {
    if (this.normalizeNavigationUrl(webContents.getURL()) === this.normalizeNavigationUrl(targetUrl)) {
      return
    }
    await webContents.loadURL(targetUrl)
    await this.waitForNavigationSettle()
  }

  /**
   * Show a platform BrowserView
   */
  async showPlatformView(platform: PlatformType): Promise<void> {
    const managed = this.platformViews.get(platform)
    if (!managed) return

    this.hideAllPlatformViewsExcept(platform)
    this.mainWindow.addBrowserView(managed.view)
    managed.isVisible = true
    this.activePlatformId = platform
  }

  /**
   * Hide a platform BrowserView
   */
  async hidePlatformView(platform: PlatformType): Promise<void> {
    const managed = this.platformViews.get(platform)
    if (!managed) return

    this.mainWindow.removeBrowserView(managed.view)
    managed.isVisible = false

    if (this.activePlatformId === platform) {
      this.activePlatformId = null
    }
  }

  /**
   * Hide all platform views except the specified one
   */
  private hideAllPlatformViewsExcept(platform: PlatformType): void {
    for (const [id, managed] of this.platformViews) {
      if (id !== platform && managed.isVisible) {
        this.mainWindow.removeBrowserView(managed.view)
        managed.isVisible = false
      }
    }
    // Also hide account-based views
    for (const managed of this.views.values()) {
      if (managed.isVisible) {
        this.mainWindow.removeBrowserView(managed.view)
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
        this.mainWindow.removeBrowserView(managed.view)
        managed.isVisible = false
      }
    }
    // Also hide account-based views
    for (const managed of this.views.values()) {
      if (managed.isVisible) {
        this.mainWindow.removeBrowserView(managed.view)
        managed.isVisible = false
      }
    }
    this.activeViewId = null
    this.activePlatformId = null
  }

  /**
   * Navigate a platform view to a URL
   */
  async navigatePlatform(platform: PlatformType, url: string): Promise<void> {
    const managed = this.platformViews.get(platform)
    if (!managed) {
      throw new Error(`No view found for platform: ${platform}`)
    }
    await managed.view.webContents.loadURL(url)
  }

  /**
   * Execute JavaScript in a platform BrowserView
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

    const extensionInjectUrl = getExtensionInjectUrl(platform, contentType)
    if (extensionInjectUrl) {
      await this.loadExactUrlIfNeeded(managed.view.webContents, extensionInjectUrl)
    } else {
      // Navigate to publish URL if not already there
      const publishUrl = this.getPublishUrl(platform, contentType)
      const currentUrl = managed.view.webContents.getURL()
      try {
        const targetHostname = new URL(publishUrl).hostname
        if (!currentUrl.includes(targetHostname)) {
          await managed.view.webContents.loadURL(publishUrl)
          // Wait for page to load
          await this.waitForNavigationSettle()
        }
      } catch {
        // If URL parsing fails, just try to navigate
        await managed.view.webContents.loadURL(publishUrl)
        await this.waitForNavigationSettle()
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

    const adapter = getAdapter(platform)
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

    const adapter = getAdapter(platform)
    if (!adapter) {
      throw new Error(`No adapter found for platform: ${platform}`)
    }

    // Call the adapter's submit method with content type
    const result = await adapter.submit(managed.view, contentType)
    if (!result.success) {
      throw new Error(result.error || '发布失败')
    }
  }

  /**
   * Close a platform BrowserView
   */
  async closePlatformView(platform: PlatformType): Promise<void> {
    const managed = this.platformViews.get(platform)
    if (!managed) return

    this.mainWindow.removeBrowserView(managed.view)
    managed.view.webContents.close()
    this.platformViews.delete(platform)

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
        this.mainWindow.removeBrowserView(current.view)
        current.isVisible = false
      }
    }

    // Show target view
    if (!target.isVisible) {
      this.mainWindow.addBrowserView(target.view)
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

  // ========== Executor BrowserView Management ==========
  // Executor views are keyed by accountId to support multiple accounts per platform

  /**
   * Open an executor BrowserView for an account
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
  ): Promise<BrowserView> {
    // Check if view already exists for this account
    const existing = this.executorViews.get(accountId)
    if (existing) {
      await this.showExecutorView(accountId)
      await this.ensureFingerprintForView(existing.view, accountId, { reloadLoadedLegacy: true })
      return existing.view
    }

    // Create partition for session isolation
    // Use account session partition if provided, otherwise fall back to executor-specific partition
    const partition = sessionPartition || `persist:executor-${accountId}`
    const ses = session.fromPartition(partition)
    hardenSession(ses)

    // Create BrowserView
    const view = new BrowserView({
      webPreferences: {
        // Security: third-party platform pages get NO app preload — do not expose
        // window.api / window.electron (raw ipcRenderer) to untrusted remote content.
        session: ses,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    })

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
    view.setAutoResize({ width: false, height: false })

    // Apply fingerprint before loading any content
    await this.ensureFingerprintForView(view, accountId)

    // Store the view keyed by accountId
    this.executorViews.set(accountId, {
      view,
      accountId,
      platform,
      isVisible: false
    })

    // Navigate to publish URL if contentType specified, otherwise platform home
    const url = this.getPublishUrl(platform, contentType)
    await view.webContents.loadURL(url)

    // Show the view
    await this.showExecutorView(accountId)

    return view
  }

  /**
   * Show an executor BrowserView by accountId
   */
  async showExecutorView(accountId: string): Promise<void> {
    const managed = this.executorViews.get(accountId)
    if (!managed) return

    // Hide all other executor views
    this.hideAllExecutorViewsExcept(accountId)

    // Also hide platform views
    this.hideAllPlatformViews()

    // Show this view
    this.mainWindow.addBrowserView(managed.view)
    managed.isVisible = true
    this.activeExecutorId = accountId

    // Update bounds
    const [width, height] = this.mainWindow.getContentSize()
    const topOffset = TABBAR_HEIGHT
    managed.view.setBounds({
      x: 0,
      y: topOffset,
      width: width,
      height: height - topOffset
    })
  }

  /**
   * Hide an executor BrowserView by accountId
   */
  async hideExecutorView(accountId: string): Promise<void> {
    const managed = this.executorViews.get(accountId)
    if (!managed) return

    this.mainWindow.removeBrowserView(managed.view)
    managed.isVisible = false

    if (this.activeExecutorId === accountId) {
      this.activeExecutorId = null
    }
  }

  /**
   * Hide all executor views except the specified one
   */
  private hideAllExecutorViewsExcept(accountId: string): void {
    for (const [id, managed] of this.executorViews) {
      if (id !== accountId && managed.isVisible) {
        this.mainWindow.removeBrowserView(managed.view)
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
        this.mainWindow.removeBrowserView(managed.view)
        managed.isVisible = false
      }
    }
    this.activeExecutorId = null
  }

  /**
   * Close an executor BrowserView by accountId
   */
  async closeExecutorView(accountId: string): Promise<void> {
    const managed = this.executorViews.get(accountId)
    if (!managed) return

    this.mainWindow.removeBrowserView(managed.view)
    managed.view.webContents.close()
    this.executorViews.delete(accountId)

    if (this.activeExecutorId === accountId) {
      this.activeExecutorId = null
    }
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
   * Fill content in an executor BrowserView using platform adapter
   */
  async fillExecutorContent(
    accountId: string,
    contentType: SyncContentType,
    data: SyncContentData,
    isAutoPublish = false
  ): Promise<ExtensionFillResult> {
    const managed = this.executorViews.get(accountId)
    if (!managed) {
      throw new Error(`No executor view found for account: ${accountId}`)
    }

    const normalizedData = this.normalizeContentData(data)

    const extensionInjectUrl = getExtensionInjectUrl(managed.platform, contentType)
    if (extensionInjectUrl) {
      await this.loadExactUrlIfNeeded(managed.view.webContents, extensionInjectUrl)
    } else {
      // Navigate to publish URL if not already there
      const publishUrl = this.getPublishUrl(managed.platform, contentType)
      const currentUrl = managed.view.webContents.getURL()
      try {
        const targetHostname = new URL(publishUrl).hostname
        if (!currentUrl.includes(targetHostname)) {
          await managed.view.webContents.loadURL(publishUrl)
          await this.waitForNavigationSettle()
        }
      } catch {
        await managed.view.webContents.loadURL(publishUrl)
        await this.waitForNavigationSettle()
      }
    }

    const extensionResult = await executeExtensionFill(
      managed.view.webContents,
      managed.platform,
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

    const adapter = getAdapter(managed.platform)
    if (!adapter) {
      throw new Error(`No adapter found for platform: ${managed.platform}`)
    }

    const fillScript = adapter.getFillScript(contentType, normalizedData)
    await managed.view.webContents.executeJavaScript(fillScript)
    return extensionResult
  }

  /**
   * Submit content in an executor BrowserView
   */
  async submitExecutorContent(accountId: string, contentType: SyncContentType): Promise<void> {
    const managed = this.executorViews.get(accountId)
    if (!managed) {
      throw new Error(`No executor view found for account: ${accountId}`)
    }

    const adapter = getAdapter(managed.platform)
    if (!adapter) {
      throw new Error(`No adapter found for platform: ${managed.platform}`)
    }

    const result = await adapter.submit(managed.view, contentType)
    if (!result.success) {
      throw new Error(result.error || '发布失败')
    }
  }

  // ========== Browser Tab Management ==========

  /**
   * Check if any BrowserView is currently visible
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

    // Home tab is always present (first tab)
    const homeTitle = this.homeView?.webContents.getTitle() || '首页'
    const homeUrl = this.homeView?.webContents.getURL() || ''
    tabs.push({
      id: HOME_TAB_ID,
      platform: 'weibo' as PlatformType, // placeholder, not used for home
      title: homeTitle,
      url: homeUrl,
      faviconUrl: undefined,
      isActive: this.activeViewId === HOME_TAB_ID && !this.activeGroupId,
      isHome: true,
      canGoBack: this.homeView?.webContents.canGoBack() || false,
      canGoForward: this.homeView?.webContents.canGoForward() || false
    })

    // Add all platform BrowserView tabs
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

    const managed = this.views.get(accountId)
    if (!managed) return

    await this.showView(accountId)
    this.notifyTabsChanged()
  }

  /**
   * Switch to home tab (hide all BrowserViews, show home view)
   */
  async switchToHome(): Promise<void> {
    // Hide all platform views
    for (const managed of this.views.values()) {
      if (managed.isVisible) {
        this.mainWindow.removeBrowserView(managed.view)
        managed.isVisible = false
      }
    }

    // Show home view
    if (this.homeView) {
      this.mainWindow.addBrowserView(this.homeView)
    }

    // Ensure tab bar stays on top
    if (this.tabBarView) {
      this.mainWindow.setTopBrowserView(this.tabBarView)
    }

    this.activeViewId = HOME_TAB_ID
    this.notifyTabsChanged()
  }

  /**
   * Close a tab by accountId (home tab cannot be closed via this method)
   */
  async closeTab(accountId: string): Promise<boolean> {
    // Cannot close home tab
    if (accountId === HOME_TAB_ID) {
      console.log('[BrowserViewManager] Cannot close home tab')
      return false
    }

    const managed = this.views.get(accountId)
    if (!managed) return false

    const wasActive = this.activeViewId === accountId

    await this.closeView(accountId)

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
    const managed = this.views.get(accountId)
    if (!managed) return

    if (managed.view.webContents.canGoBack()) {
      managed.view.webContents.goBack()
    }
  }

  /**
   * Go forward in tab history
   */
  async tabGoForward(accountId: string): Promise<void> {
    const managed = this.views.get(accountId)
    if (!managed) return

    if (managed.view.webContents.canGoForward()) {
      managed.view.webContents.goForward()
    }
  }

  /**
   * Refresh a tab
   */
  async tabRefresh(accountId: string): Promise<void> {
    const managed = this.views.get(accountId)
    if (!managed) return

    managed.view.webContents.reload()
  }

  /**
   * Notify tab bar that tabs have changed
   */
  private notifyTabsChanged(): void {
    const tabs = this.getTabs()
    // Send to tab bar BrowserView
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

    console.log(`[BrowserViewManager] Creating publish group: ${groupName}`)

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

    // Create BrowserView for each target account
    for (const target of targets) {
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
        console.log(`[BrowserViewManager] Using new partition (${newCookies.length} cookies): ${newPartition}`)
      } else {
        const oldSes = session.fromPartition(oldPartition)
        const oldCookies = await oldSes.cookies.get({})
        if (oldCookies.length > 0) {
          console.log(`[BrowserViewManager] Falling back to old partition (${oldCookies.length} cookies): ${oldPartition}`)
          partition = oldPartition
        } else {
          console.log(`[BrowserViewManager] No cookies in either partition, using new: ${newPartition}`)
        }
      }

      console.log(`[BrowserViewManager] Account ${displayName} using partition: ${partition}`)
      const ses = session.fromPartition(partition)
      hardenSession(ses)
      registerLocalFileProtocol(ses)

      // Create BrowserView
      const view = new BrowserView({
        webPreferences: {
          // Security: third-party platform pages get NO app preload — do not expose
          // window.api / window.electron (raw ipcRenderer) to untrusted remote content.
          session: ses,
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true
        }
      })

      view.setBounds({
        x: 0,
        y: topOffset,
        width: width,
        height: height - topOffset
      })
      view.setAutoResize({ width: false, height: false })

      await this.ensureFingerprintForView(view, accountId)

      // Store in group
      group.views.set(accountId, {
        view,
        accountId,
        platform,
        displayName,
        status: 'pending',
        isVisible: false
      })

      // Capture console output from this view (dev only)
      this.debugAttachConsoleCapture(view.webContents, `group:${displayName}:${platform}`)

      // Navigate to publish URL
      const publishUrl = this.getPublishUrl(platform, contentType)
      console.log(`[BrowserViewManager] Loading ${displayName}: ${publishUrl}`)
      await view.webContents.loadURL(publishUrl)
    }

    // Set first account as active
    if (targets.length > 0) {
      group.activeAccountId = targets[0].accountId
    }

    // Store the group
    this.publishGroups.set(groupId, group)

    // Show the group
    await this.showPublishGroup(groupId)

    // 自动执行填充 - 等待页面加载完成后执行
    setTimeout(async () => {
      try {
        console.log(`[BrowserViewManager] Auto-filling content for group: ${groupName}`)
        const fillResults = await this.fillGroupContent(groupId)

        // 自动发布：填充完成后自动提交
        if (group.autoPublish) {
          const allReady = Array.from(group.views.values()).every((t) => t.status === 'ready' || t.status === 'success')
          if (allReady) {
            const skipAdapterSubmitFor = new Set(
              Array.from(fillResults.entries())
                .filter(([, result]) => result.handled && result.ok && result.skipAdapterSubmit)
                .map(([accountId]) => accountId)
            )
            console.log(`[BrowserViewManager] Auto-publishing group: ${groupName}`)
            await this.submitGroupAll(groupId, { skipAdapterSubmitFor })
            this.startAutoCloseCountdown(groupId)
          } else {
            console.log(`[BrowserViewManager] Not all targets ready, skipping auto-publish for group: ${groupName}`)
          }
        }
      } catch (error) {
        console.error(`[BrowserViewManager] Auto-fill failed for group ${groupId}:`, error)
      }
    }, 3000) // 等待 3 秒让页面加载

    return groupId
  }

  /**
   * Show a publish group (switch to it in the tab bar)
   */
  async showPublishGroup(groupId: string): Promise<void> {
    const group = this.publishGroups.get(groupId)
    if (!group) return

    // Hide home view
    if (this.homeView) {
      this.mainWindow.removeBrowserView(this.homeView)
    }

    // Hide all other views
    for (const managed of this.views.values()) {
      if (managed.isVisible) {
        this.mainWindow.removeBrowserView(managed.view)
        managed.isVisible = false
      }
    }

    // Hide all other groups
    for (const [id, g] of this.publishGroups) {
      if (id !== groupId) {
        for (const target of g.views.values()) {
          if (target.isVisible) {
            this.mainWindow.removeBrowserView(target.view)
            target.isVisible = false
          }
        }
      }
    }

    // Show active view in this group
    if (group.activeAccountId) {
      const target = group.views.get(group.activeAccountId)
      if (target) {
        this.mainWindow.addBrowserView(target.view)
        target.isVisible = true
      }
    }

    // Ensure tab bar stays on top
    if (this.tabBarView) {
      this.mainWindow.setTopBrowserView(this.tabBarView)
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
        this.mainWindow.removeBrowserView(currentTarget.view)
        currentTarget.isVisible = false
      }
    }

    // Show new active view
    this.mainWindow.addBrowserView(target.view)
    target.isVisible = true

    // Ensure tab bar stays on top
    if (this.tabBarView) {
      this.mainWindow.setTopBrowserView(this.tabBarView)
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

    // Remove from window if visible
    if (target.isVisible) {
      this.mainWindow.removeBrowserView(target.view)
    }

    // Destroy the view
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

    // Remove all views
    for (const target of group.views.values()) {
      if (target.isVisible) {
        this.mainWindow.removeBrowserView(target.view)
      }
      target.view.webContents.close()
    }

    // Delete the group
    this.publishGroups.delete(groupId)

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
    console.log(`[BrowserViewManager] Auto-close countdown: ${delaySec}s for group ${groupId}`)

    this.notifyGroupTabsChanged(groupId)

    setTimeout(async () => {
      try {
        await this.closePublishGroup(groupId)
        console.log(`[BrowserViewManager] Auto-closed group ${groupId}`)
      } catch (error) {
        console.error(`[BrowserViewManager] Auto-close failed for group ${groupId}:`, error)
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
        isActive: group.activeAccountId === accountId
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
        status: t.status
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
        status: t.status
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
    function toFileData(item: string | { url: string; name: string; type?: string }): {
      url: string
      name: string
      type: string
    } {
      if (typeof item === 'string') {
        // Convert file path to local-file:// URL
        const name = basename(item)
        const ext = extname(item).slice(1).toLowerCase()
        const type = getMimeType(item) || `image/${ext}`
        // Standard scheme URL: local-file:// + path (Chromium treats first segment as host)
        // e.g. /tmp/photo.png -> local-file://tmp/photo.png (host=tmp, path=/photo.png)
        // The protocol handler reconstructs: '/' + host + pathname = /tmp/photo.png
        return { url: createLocalFileUrl(item), name, type }
      }
      return { url: item.url, name: item.name, type: item.type || 'application/octet-stream' }
    }

    const normalized = { ...data }

    if ('images' in normalized && Array.isArray(normalized.images)) {
      normalized.images = normalized.images.map(toFileData)
    }
    if ('videos' in normalized && Array.isArray(normalized.videos)) {
      normalized.videos = normalized.videos.map(toFileData)
    }
    if ('video' in normalized && normalized.video) {
      normalized.video = typeof normalized.video === 'string' ? toFileData(normalized.video) : normalized.video
    }
    if ('cover' in normalized && normalized.cover) {
      normalized.cover = typeof normalized.cover === 'string' ? toFileData(normalized.cover) : normalized.cover
    }
    if ('horizontalCover' in normalized && normalized.horizontalCover) {
      normalized.horizontalCover =
        typeof normalized.horizontalCover === 'string'
          ? toFileData(normalized.horizontalCover)
          : normalized.horizontalCover
    }
    if ('verticalCover' in normalized && normalized.verticalCover) {
      normalized.verticalCover =
        typeof normalized.verticalCover === 'string'
          ? toFileData(normalized.verticalCover)
          : normalized.verticalCover
    }
    if ('audio' in normalized && normalized.audio) {
      normalized.audio = typeof normalized.audio === 'string' ? toFileData(normalized.audio) : normalized.audio
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

    for (const [accountId, target] of group.views) {
      try {
        target.status = 'filling'
        this.notifyGroupTabsChanged(groupId)

        // Wait for page to be ready
        await new Promise((resolve) => setTimeout(resolve, 1000))

        const extensionInjectUrl = getExtensionInjectUrl(target.platform, group.contentType)
        if (extensionInjectUrl) {
          await this.loadExactUrlIfNeeded(target.view.webContents, extensionInjectUrl)
        }

        const extensionResult = await executeExtensionFill(
          target.view.webContents,
          target.platform,
          group.contentType,
          normalizedData,
          group.autoPublish
        )
        if (extensionResult.handled) {
          fillResults.set(accountId, extensionResult)
          if (!extensionResult.ok) {
            throw new Error(extensionResult.error || '扩展发布脚本执行失败')
          }
          // TODO(phase3): use injector-confirmed publish state before marking extension auto-publish as success.
          target.status = 'ready'
          console.log(`[BrowserViewManager] Filled content for ${target.displayName} via extension injector`)
          this.notifyGroupTabsChanged(groupId)
          this.updateGroupStatus(groupId)
          continue
        }

        const adapter = getAdapter(target.platform)
        if (!adapter) {
          target.status = 'failed'
          console.error(`No adapter found for platform: ${target.platform}`)
          continue
        }

        const fillScript = adapter.getFillScript(group.contentType, normalizedData)
        await target.view.webContents.executeJavaScript(fillScript)

        target.status = 'ready'
        console.log(`[BrowserViewManager] Filled content for ${target.displayName}`)
      } catch (error) {
        target.status = 'failed'
        console.error(`Failed to fill content for ${accountId}:`, error)
      }

      this.notifyGroupTabsChanged(groupId)
    }

    return fillResults
  }

  /**
   * Submit content for a single target in a publish group
   */
  async submitGroupTarget(
    groupId: string,
    accountId: string,
    options: { skipAdapterSubmit?: boolean } = {}
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
      target.status = 'ready'
      this.notifyGroupTabsChanged(groupId)
      this.updateGroupStatus(groupId)
      return
    }

    const adapter = getAdapter(target.platform)
    if (!adapter) {
      throw new Error(`No adapter found for platform: ${target.platform}`)
    }

    try {
      const result = await adapter.submit(target.view, group.contentType)
      if (result.success) {
        target.status = 'success'
      } else {
        target.status = 'failed'
      }
    } catch (error) {
      target.status = 'failed'
      throw error
    } finally {
      this.notifyGroupTabsChanged(groupId)
      this.updateGroupStatus(groupId)
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
        await this.submitGroupTarget(groupId, accountId, {
          skipAdapterSubmit: options.skipAdapterSubmitFor?.has(accountId) === true
        })
      } catch (error) {
        console.error(`Failed to submit for ${accountId}:`, error)
      }
    }
  }

  /**
   * Update the overall status of a publish group
   */
  private updateGroupStatus(groupId: string): void {
    const group = this.publishGroups.get(groupId)
    if (!group) return

    const statuses = Array.from(group.views.values()).map((t) => t.status)

    if (statuses.every((s) => s === 'success')) {
      group.status = 'completed'
    } else if (statuses.some((s) => s === 'failed')) {
      group.status = 'failed'
    } else if (statuses.every((s) => s === 'ready' || s === 'success')) {
      group.status = 'preparing'
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

    target.status = status
    this.notifyGroupTabsChanged(groupId)
    this.updateGroupStatus(groupId)
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
      homeUrl: this.homeView?.webContents.getURL(),
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
    if (!this.homeView) throw new Error('Home view not available')
    await this.homeView.webContents.loadURL(url)
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
   * Execute script in a view by ID (accountId or '__home__')
   */
  async debugExecScript(viewId: string, script: string): Promise<unknown> {
    if (viewId === '__home__' && this.homeView) {
      return this.homeView.webContents.executeJavaScript(script)
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
