import { app, BrowserWindow, ipcMain, nativeTheme, Notification, protocol, session } from 'electron'
import { join } from 'path'
import { existsSync, readdirSync, rmSync, statSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerIpcHandlers } from './ipc'
import { BrowserViewManager } from './browser/browserViewManager'
import { DatabaseService } from './database'
import { initAutoUpdater, registerUpdaterIpcHandlers, checkForUpdatesSilently } from './updater'
import { createMenu } from './menu'
import { KeepAliveService } from './keepalive'
import { startDebugServer } from './debug-server'
import { cleanupApiMedia, initOperations } from './services/operations'
import { initInjectorHotUpdate } from './injectors/hotUpdate'
import { stopExternalApiServer, syncExternalApiServer } from './api-server'
import { getDesktopUserAgent, handleLocalFileRequest, hardenSession } from './browser/sessionHardening'
import { closeAllAnonymizedProxies } from './proxy/accountProxy'
import { openExternalUrl } from './browser/externalUrl'
import { loadWindowState, trackWindowState } from './windowState'
import { getCloseWindowBehavior } from './appSettings'
import { createTray } from './tray'
import { IPC_CHANNELS, PLATFORMS } from '../shared/constants'
import { toPublicAccount, type Account } from '../shared/types'
import log from 'electron-log/main'
import { initLogging } from './logger'
import { initSentryMain } from './observability/sentry'
import { initProxyManager } from './proxy/proxyManager'

// Unified logging: console.* and scoped module loggers land in per-module
// files under userData/logs (main/renderer/keepalive/publish/ipc) with
// rotation, so production issues are diagnosable from files users can send us.
initLogging()

// Crash/error monitoring (Sentry). Initialized as early as possible — before
// app.whenReady — so main-process crashes during startup are still captured.
// Opt-out lives in Settings → 数据与隐私; sensitive data is scrubbed in-process.
initSentryMain()

// Process-level safety net: log instead of silently dying. Electron would
// otherwise show a generic crash dialog (uncaughtException) or nothing at all
// (unhandledRejection), which is hostile for a production desktop app.
process.on('uncaughtException', (error) => {
  log.error('[Main] Uncaught exception:', error)
})
process.on('unhandledRejection', (reason) => {
  log.error('[Main] Unhandled rejection:', reason)
})

// Single instance: a second launch focuses the existing window instead of
// spawning a parallel app fighting over the same SQLite db and sessions.
const hasSingleInstanceLock = app.requestSingleInstanceLock()
if (!hasSingleInstanceLock) {
  app.quit()
}
app.on('second-instance', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  } else if (app.isReady()) {
    createWindow()
  }
})

// 在 app.whenReady() 之前注册 local-file:// 协议
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local-file',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true
    }
  }
])

app.commandLine.appendSwitch('force-webrtc-ip-handling-policy', 'default_public_interface_only')

let mainWindow: BrowserWindow | null = null
let browserViewManager: BrowserViewManager | null = null
let isQuitting = false

function showMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

// The in-app toast covers the focused-window case; a system notification is
// what reaches the user while the app sits in the tray or behind other windows.
function notifyAccountLoggedOut(account: Account): void {
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible() && mainWindow.isFocused()) {
    return
  }
  if (!Notification.isSupported()) return
  const platformName = PLATFORMS[account.platform]?.name || account.platform
  const who = account.displayName || account.username || ''
  const notification = new Notification({
    title: '账号登录已过期',
    body: `${platformName}${who ? ` · ${who}` : ''} 已掉线，请打开 MultiPost 重新登录`
  })
  notification.on('click', showMainWindow)
  notification.show()
}
const keepAliveService = new KeepAliveService()
let proxyCleanupStarted = false
let proxyCleanupComplete = false

function cleanupPastedClipboardFiles(): void {
  try {
    // Legacy location only — current pasted images live in userData (see
    // cleanupOrphanedPastedImages) so the publish form cache survives restarts.
    rmSync(join(app.getPath('temp'), 'multipost-pasted'), { recursive: true, force: true })
  } catch (error) {
    console.warn('[Main] Failed to clean up pasted clipboard files:', error)
  }
}

const PASTED_IMAGE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000

// Pasted screenshots persist in userData so form-cache restore works across
// restarts, which means they would otherwise accumulate forever. Sweep files
// past the retention window unless a saved draft still references them; the
// renderer's restore path already tolerates (and reports) missing files.
function cleanupOrphanedPastedImages(): void {
  try {
    const dir = join(app.getPath('userData'), 'pasted-images')
    if (!existsSync(dir)) return

    const referenced = new Set<string>()
    for (const draft of DatabaseService.getInstance().listDrafts()) {
      const paths = [...(draft.images || []), ...(draft.videos || []), draft.video, draft.cover]
      for (const path of paths) {
        if (path) referenced.add(path)
      }
    }

    const now = Date.now()
    for (const name of readdirSync(dir)) {
      const filePath = join(dir, name)
      if (referenced.has(filePath)) continue
      try {
        if (now - statSync(filePath).mtimeMs > PASTED_IMAGE_RETENTION_MS) {
          rmSync(filePath, { force: true })
        }
      } catch {
        // Skip files that vanish mid-sweep
      }
    }
  } catch (error) {
    console.warn('[Main] Failed to clean up orphaned pasted images:', error)
  }
}

function cleanupAccountProxies(): void {
  if (proxyCleanupStarted || proxyCleanupComplete) {
    return
  }

  proxyCleanupStarted = true
  void closeAllAnonymizedProxies()
    .catch((error) => {
      console.warn('[Main] Failed to clean up account proxies:', error)
    })
    .finally(() => {
      proxyCleanupComplete = true
      proxyCleanupStarted = false
    })
}

app.on('will-quit', (event) => {
  cleanupPastedClipboardFiles()
  void stopExternalApiServer()

  if (proxyCleanupComplete) {
    return
  }

  event.preventDefault()
  if (proxyCleanupStarted) {
    return
  }

  proxyCleanupStarted = true
  void closeAllAnonymizedProxies()
    .catch((error) => {
      console.warn('[Main] Failed to clean up account proxies:', error)
    })
    .finally(() => {
      proxyCleanupComplete = true
      proxyCleanupStarted = false
      app.quit()
    })
})

app.on('quit', cleanupAccountProxies)

interface WindowChromeColors {
  background: string
  symbol: string
}

// The renderer chrome follows the system theme (next-themes), so the native
// window background and title bar overlay must follow it too. Values mirror
// the --background token in renderer global.css (light 100% / dark 3.9%);
// any drift shows up as a colored seam around the page.
function getWindowChromeColors(): WindowChromeColors {
  return nativeTheme.shouldUseDarkColors
    ? { background: '#0a0a0a', symbol: '#a3a3a3' }
    : { background: '#f8f8f8', symbol: '#404040' }
}

function createWindow(): void {
  const isDarwin = process.platform === 'darwin'
  const chromeColors = getWindowChromeColors()
  const persistedState = loadWindowState()

  mainWindow = new BrowserWindow({
    width: persistedState?.bounds.width ?? 1200,
    height: persistedState?.bounds.height ?? 800,
    ...(persistedState ? { x: persistedState.bounds.x, y: persistedState.bounds.y } : {}),
    minWidth: 920,
    minHeight: 600,
    center: !persistedState,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: chromeColors.background,
    titleBarStyle: isDarwin ? 'hiddenInset' : 'hidden',
    ...(isDarwin
      ? { trafficLightPosition: { x: 14, y: 13 } }
      : {
          titleBarOverlay: {
            color: chromeColors.background,
            symbolColor: chromeColors.symbol,
            height: 36
          }
        }),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (persistedState?.isMaximized) {
    mainWindow.maximize()
  }
  trackWindowState(mainWindow)

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    // Update BrowserView bounds after the native window finishes showing.
    setTimeout(() => {
      browserViewManager?.updateBounds()
    }, 200)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    void openExternalUrl(details.url)
    return { action: 'deny' }
  })

  // Close keeps the app running in the background (tray on Windows/Linux,
  // Dock on macOS) unless the user opted into quit-on-close.
  mainWindow.on('close', (event) => {
    if (isQuitting) return
    if (getCloseWindowBehavior() === 'minimize') {
      event.preventDefault()
      mainWindow?.hide()
      return
    }
    // quit-on-close must also quit on macOS, where window-all-closed doesn't
    if (process.platform === 'darwin') {
      isQuitting = true
      app.quit()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Initialize BrowserView manager (handles all tabs including home)
  browserViewManager = new BrowserViewManager(mainWindow)

  // Load a blank page for the main window - all content is rendered via BrowserViews
  // This prevents the main window from interfering with BrowserView click events
  mainWindow.loadURL('about:blank')

  // Initialize home tab immediately (no need to wait for blank page)
  browserViewManager.initializeHomeTab()

  // Keep the native window chrome in sync with the system theme
  nativeTheme.on('updated', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    const colors = getWindowChromeColors()
    mainWindow.setBackgroundColor(colors.background)
    if (process.platform !== 'darwin') {
      mainWindow.setTitleBarOverlay?.({
        color: colors.background,
        symbolColor: colors.symbol,
        height: 36
      })
    }
  })
}

app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.multipost.desktop')
  app.userAgentFallback = getDesktopUserAgent()

  // 注册 local-file:// 协议处理器
  protocol.handle('local-file', handleLocalFileRequest)

  // Initialize database
  await DatabaseService.getInstance().initialize()

  cleanupOrphanedPastedImages()
  cleanupApiMedia()

  // Register IPC handlers
  registerIpcHandlers(ipcMain, () => browserViewManager, keepAliveService)
  registerUpdaterIpcHandlers()

  // Default open or close DevTools by F12 in development
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  hardenSession(session.defaultSession, { includeDesktopHeader: true })
  await initProxyManager()

  createMenu()
  createWindow()

  // Initialize auto-updater after window is created
  if (mainWindow) {
    // UI lives in BrowserViews, so updater status must be broadcast through the manager
    initAutoUpdater(mainWindow, (channel, payload) =>
      browserViewManager?.broadcastToUi(channel, payload)
    )

    // Check for updates after app starts (only in production)
    if (!is.dev) {
      setTimeout(() => {
        checkForUpdatesSilently()
      }, 5000)
    }
  }

  // Start keep-alive service after window is ready
  if (browserViewManager) {
    const manager = browserViewManager
    keepAliveService.start({
      getLoginStatus: (accountId, platform) => manager.getLoginStatus(accountId, platform),
      onAccountLoggedOut: (account) => {
        const publicAccount = toPublicAccount(account)
        // Same event the manual "检测" path emits, so account lists hot-update
        manager.broadcastToUi(IPC_CHANNELS.ACCOUNT_UPDATED_EVENT, publicAccount)
        manager.broadcastToUi(IPC_CHANNELS.KEEPALIVE_ACCOUNT_LOGGED_OUT_EVENT, publicAccount)
        notifyAccountLoggedOut(publicAccount)
      },
      onStatusChanged: (status) => {
        manager.broadcastToUi(IPC_CHANNELS.KEEPALIVE_STATUS_EVENT, status)
      }
    })
  }

  // Start debug HTTP server in dev mode
  if (is.dev) {
    startDebugServer(
      () => mainWindow,
      () => browserViewManager
    )
  }

  // External operations API (REST + MCP) — opt-in, loopback-only
  initOperations(
    () => browserViewManager,
    () => mainWindow
  )
  syncExternalApiServer().catch((error) => {
    console.error('[Main] Failed to start external API server:', error)
  })

  // Injector hot-update: hydrate from verified cache + (when enabled) poll web for
  // newer platform scripts. Never blocks startup; degrades to built-in on any error.
  initInjectorHotUpdate()
  // The app is built to run for days on a second screen, so a startup-only
  // sweep would let api-media grow between launches; re-sweep periodically.
  // unref() so the timer never holds the process open at quit.
  setInterval(cleanupApiMedia, 6 * 60 * 60 * 1000).unref()

  createTray(showMainWindow)

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else {
      // The window is usually just hidden (close = keep running)
      showMainWindow()
    }
  })
})

app.on('before-quit', () => {
  isQuitting = true
})

app.on('window-all-closed', () => {
  keepAliveService.stop()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Export for use in other modules
export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

export function getBrowserViewManager(): BrowserViewManager | null {
  return browserViewManager
}
