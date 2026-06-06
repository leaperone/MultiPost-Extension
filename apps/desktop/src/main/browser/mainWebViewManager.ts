/**
 * Main WebView Manager
 *
 * 管理主站 WebView 的加载、导航和通信
 */

import { BrowserView, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { isSupportedBrowserNavigationUrl, openExternalUrl } from './externalUrl'

// 开发环境使用本地地址，生产环境使用线上地址
const WEB_BASE_URL = is.dev
  ? process.env.MULTIPOST_WEB_URL || 'http://localhost:3000'
  : 'https://multipost.app'

const DESKTOP_PATH = '/dashboard'
type NavigationGuardableWebContents = Electron.WebContents & {
  on(
    event: 'will-frame-navigate',
    listener: (event: Electron.Event, url: string) => void
  ): Electron.WebContents
}

export class MainWebViewManager {
  private mainWindow: BrowserWindow
  private webView: BrowserView | null = null
  private currentPath: string = DESKTOP_PATH
  // 不再需要侧边栏宽度，WebView 占据整个窗口

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow
    this.setupIpcHandlers()
  }

  /**
   * 初始化 WebView
   */
  initialize(): void {
    console.log('[MainWebViewManager] Initializing...')
    this.createWebView()
    this.setupWindowListeners()
    console.log('[MainWebViewManager] Initialized, loading URL:', `${WEB_BASE_URL}${DESKTOP_PATH}`)
  }

  /**
   * 创建 WebView
   */
  private createWebView(): void {
    const preloadPath = join(__dirname, '../preload/webview.js')

    this.webView = new BrowserView({
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        webSecurity: true
      }
    })

    this.mainWindow.addBrowserView(this.webView)
    this.updateBounds()

    // 加载初始页面
    this.loadURL(DESKTOP_PATH)

    // 设置事件监听
    this.setupWebViewEvents()
  }

  /**
   * 设置 WebView 事件监听
   */
  private setupWebViewEvents(): void {
    if (!this.webView) return

    const webContents = this.webView.webContents
    const guardNavigation = (event: Electron.Event, url: string): void => {
      if (isSupportedBrowserNavigationUrl(url)) {
        return
      }

      event.preventDefault()
      console.warn('[MainWebViewManager] Blocked unsupported navigation:', url)
      void openExternalUrl(url)
    }

    webContents.on('will-navigate', guardNavigation)
    ;(webContents as NavigationGuardableWebContents).on('will-frame-navigate', guardNavigation)
    webContents.on('will-redirect', guardNavigation)

    // 页面导航完成
    webContents.on('did-navigate', (_, url) => {
      this.handleNavigation(url)
    })

    webContents.on('did-navigate-in-page', (_, url) => {
      this.handleNavigation(url)
    })

    // 页面加载失败
    webContents.on('did-fail-load', (_, errorCode, errorDescription, validatedURL) => {
      console.error(`WebView load failed: ${errorCode} - ${errorDescription} - ${validatedURL}`)
      // TODO: 显示离线页面或错误提示
    })

    // 新窗口请求（外部链接）
    webContents.setWindowOpenHandler(({ url }) => {
      void openExternalUrl(url)
      return { action: 'deny' }
    })

    // 开发环境打开 DevTools
    if (is.dev) {
      webContents.openDevTools({ mode: 'detach' })
    }

    // 捕获 WebView 的 console 输出
    webContents.on('console-message', (_, level, message, line, sourceId) => {
      const levelStr = ['verbose', 'info', 'warning', 'error'][level] || 'log'
      console.log(`[WebView ${levelStr}] ${message} (${sourceId}:${line})`)
    })
  }

  /**
   * 处理导航事件
   */
  private handleNavigation(url: string): void {
    try {
      const urlObj = new URL(url)
      const path = urlObj.pathname

      // 处理 /dashboard 路径（以及旧的 /desktop 路径用于向后兼容）
      if (path.startsWith(DESKTOP_PATH) || path.startsWith('/desktop')) {
        this.currentPath = path
        // 通知渲染进程更新侧边栏状态
        this.mainWindow.webContents.send('webview:path-changed', path)
      }
    } catch (error) {
      console.error('Failed to parse URL:', error)
    }
  }

  /**
   * 设置窗口事件监听
   */
  private setupWindowListeners(): void {
    // 窗口大小变化时更新 WebView 边界
    this.mainWindow.on('resize', () => {
      // 检查窗口是否已被销毁
      if (this.mainWindow.isDestroyed()) return

      this.updateBounds()
      // 通知 WebView 窗口大小变化
      if (this.webView && !this.webView.webContents.isDestroyed()) {
        const [width, height] = this.mainWindow.getSize()
        this.webView.webContents.send('multipost:window:resize', { width, height })
      }
    })
  }

  /**
   * 更新 WebView 边界
   * WebView 占据整个内容区域（不包括标题栏）
   */
  updateBounds(): void {
    if (!this.webView) return
    if (this.mainWindow.isDestroyed()) return

    // 使用 getContentSize 获取内容区域大小（不包括标题栏）
    const [width, height] = this.mainWindow.getContentSize()
    const newBounds = {
      x: 0,
      y: 0,
      width,
      height
    }

    this.webView.setBounds(newBounds)
  }

  /**
   * 加载 URL
   */
  loadURL(path: string): void {
    if (!this.webView) return

    // 确保路径以 /desktop 开头
    const fullPath = path.startsWith(DESKTOP_PATH) ? path : `${DESKTOP_PATH}${path}`
    const url = `${WEB_BASE_URL}${fullPath}`

    this.webView.webContents.loadURL(url)
    this.currentPath = fullPath
  }

  /**
   * 导航到指定路径
   */
  navigateTo(path: string): void {
    this.loadURL(path)
  }

  /**
   * 获取当前路径
   */
  getCurrentPath(): string {
    return this.currentPath
  }

  /**
   * 显示 WebView
   */
  show(): void {
    if (this.webView) {
      this.mainWindow.addBrowserView(this.webView)
      this.updateBounds()
    }
  }

  /**
   * 隐藏 WebView
   */
  hide(): void {
    if (this.webView) {
      this.mainWindow.removeBrowserView(this.webView)
    }
  }

  /**
   * 刷新 WebView
   */
  reload(): void {
    if (this.webView) {
      this.webView.webContents.reload()
    }
  }

  /**
   * 返回
   */
  goBack(): void {
    if (this.webView && this.webView.webContents.canGoBack()) {
      this.webView.webContents.goBack()
    }
  }

  /**
   * 前进
   */
  goForward(): void {
    if (this.webView && this.webView.webContents.canGoForward()) {
      this.webView.webContents.goForward()
    }
  }

  /**
   * 销毁 WebView
   */
  destroy(): void {
    if (this.webView) {
      this.mainWindow.removeBrowserView(this.webView)
      // @ts-expect-error - destroy is available on BrowserView
      this.webView.webContents.destroy()
      this.webView = null
    }
  }

  /**
   * 设置 IPC 处理器
   */
  private setupIpcHandlers(): void {
    // 导航报告
    ipcMain.on('multipost:navigation:reportPath', (_, path: string) => {
      this.currentPath = path
      this.mainWindow.webContents.send('webview:path-changed', path)
    })

    // 导航请求
    ipcMain.on('multipost:navigation:navigateTo', (_, path: string) => {
      // Show WebView when navigating to a web path
      this.show()
      this.navigateTo(path)
    })

    // 显示/隐藏 WebView（用于原生页面切换）
    ipcMain.on('multipost:webview:show', () => {
      this.show()
    })

    ipcMain.on('multipost:webview:hide', () => {
      this.hide()
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

    // 设置默认账号（简化版本）
    ipcMain.handle('multipost:account:setDefault', async (_, id: string) => {
      // 转发到原有的账号管理处理器
      // 这里需要获取账号的 platform 信息
      const { DatabaseService } = await import('../database/index.js')
      const account = await DatabaseService.getInstance().getAccount(id)
      if (account) {
        await DatabaseService.getInstance().setDefaultAccount(id, account.platform)
      }
    })
  }
}
