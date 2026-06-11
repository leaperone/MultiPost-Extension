import { app, BrowserWindow, ipcMain, nativeTheme, protocol, session } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerIpcHandlers } from './ipc'
import { BrowserViewManager } from './browser/browserViewManager'
import { DatabaseService } from './database'
import { initAutoUpdater, registerUpdaterIpcHandlers, checkForUpdatesSilently } from './updater'
import { createMenu } from './menu'
import { KeepAliveService } from './keepalive'
import { startDebugServer } from './debug-server'
import { getDesktopUserAgent, handleLocalFileRequest, hardenSession } from './browser/sessionHardening'
import { closeAllAnonymizedProxies } from './proxy/accountProxy'
import { openExternalUrl } from './browser/externalUrl'
import { loadWindowState, trackWindowState } from './windowState'
import log from 'electron-log/main'

// Unified logging: console.* in the main process lands in
// userData/logs/main.log with rotation, so production issues are diagnosable
// from a file users can actually send us.
// preload:false is critical — electron-log otherwise injects a logging preload
// (window.__electronLog) into every future session, including the untrusted
// platform BrowserViews that are supposed to receive no app preload at all.
log.initialize({ preload: false, spyRendererConsole: false })
log.transports.file.maxSize = 5 * 1024 * 1024
log.transports.file.resolvePathFn = () => join(app.getPath('userData'), 'logs', 'main.log')
log.transports.file.writeOptions = { ...log.transports.file.writeOptions, mode: 0o600 }
Object.assign(console, log.functions)

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
const keepAliveService = new KeepAliveService()
let proxyCleanupStarted = false
let proxyCleanupComplete = false

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
// window background and title bar overlay must follow it too.
function getWindowChromeColors(): WindowChromeColors {
  return nativeTheme.shouldUseDarkColors
    ? { background: '#101014', symbol: '#cbd5e1' }
    : { background: '#f7f8fa', symbol: '#334155' }
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

  // Register IPC handlers
  registerIpcHandlers(ipcMain, () => browserViewManager, keepAliveService)
  registerUpdaterIpcHandlers()

  // Default open or close DevTools by F12 in development
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  hardenSession(session.defaultSession, { includeDesktopHeader: true })

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
      getLoginStatus: (accountId, platform) => manager.getLoginStatus(accountId, platform)
    })
  }

  // Start debug HTTP server in dev mode
  if (is.dev) {
    startDebugServer(
      () => mainWindow,
      () => browserViewManager
    )
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
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
