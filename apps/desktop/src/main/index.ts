import { app, shell, BrowserWindow, ipcMain, protocol, session } from 'electron'
import { join } from 'path'
import * as fs from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerIpcHandlers } from './ipc'
import { BrowserViewManager } from './browser/browserViewManager'
import { DatabaseService } from './database'
import { initAutoUpdater, registerUpdaterIpcHandlers, checkForUpdatesSilently } from './updater'
import { createMenu } from './menu'
import { getMimeType } from './utils/mime'
import { KeepAliveService } from './keepalive'
import { startDebugServer } from './debug-server'

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

let mainWindow: BrowserWindow | null = null
let browserViewManager: BrowserViewManager | null = null
const keepAliveService = new KeepAliveService()

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.maximize()
    mainWindow?.show()
    // Update view bounds after maximize settles
    setTimeout(() => {
      browserViewManager?.updateBounds()
    }, 200)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Initialize BrowserView manager (handles all tabs including home)
  browserViewManager = new BrowserViewManager(mainWindow)

  // Load a blank page for the main window - all content is rendered via BrowserViews
  // This prevents the main window from interfering with BrowserView click events
  mainWindow.loadURL('about:blank')

  // Initialize home tab immediately (no need to wait for blank page)
  browserViewManager.initializeHomeTab()
}

app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.multipost.desktop')

  // 注册 local-file:// 协议处理器
  protocol.handle('local-file', async (request) => {
    const url = new URL(request.url)
    // Standard scheme URL: Chromium puts first path segment in host
    // e.g. local-file://tmp/photo.png -> host=tmp, pathname=/photo.png
    // Reconstruct: '/' + host + pathname = /tmp/photo.png
    const filePath = decodeURIComponent('/' + url.host + url.pathname)

    // 安全检查：验证文件存在
    if (!fs.existsSync(filePath)) {
      return new Response('File not found', { status: 404 })
    }

    // 安全检查：禁止目录遍历
    if (filePath.includes('..')) {
      return new Response('Invalid path', { status: 403 })
    }

    try {
      const buffer = await fs.promises.readFile(filePath)
      const mimeType = getMimeType(filePath)

      return new Response(buffer, {
        headers: { 'Content-Type': mimeType }
      })
    } catch (error) {
      console.error('Failed to read file:', filePath, error)
      return new Response('Failed to read file', { status: 500 })
    }
  })

  // Initialize database
  await DatabaseService.getInstance().initialize()

  // Register IPC handlers
  registerIpcHandlers(ipcMain, () => browserViewManager, keepAliveService)
  registerUpdaterIpcHandlers()

  // Default open or close DevTools by F12 in development
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Inject custom header for desktop detection on web app requests
  const webAppUrls = is.dev
    ? ['http://localhost:3000/*']
    : ['https://multipost.app/*']
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: webAppUrls },
    (details, callback) => {
      details.requestHeaders['X-MultiPost-Desktop'] = '1'
      callback({ requestHeaders: details.requestHeaders })
    }
  )

  createMenu()
  createWindow()

  // Initialize auto-updater after window is created
  if (mainWindow) {
    initAutoUpdater(mainWindow)

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
