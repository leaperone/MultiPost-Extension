import { autoUpdater, UpdateInfo, ProgressInfo, UpdateDownloadedEvent } from 'electron-updater'
import { BrowserWindow, ipcMain, dialog, app } from 'electron'
import { is } from '@electron-toolkit/utils'
import { IPC_CHANNELS } from '../../shared/constants'
import {
  getIgnoredUpdateVersion,
  setIgnoredUpdateVersion,
  normalizeIgnoredUpdateVersion
} from '../appSettings'

export interface UpdateStatus {
  status: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  info?: UpdateInfo
  progress?: ProgressInfo
  error?: string
}

// 更新源配置（按优先级排序）
const UPDATE_SOURCES = [
  {
    name: 'Bitiful S3',
    provider: 'generic' as const,
    url: 'https://static.2some.ren/release/multipost-desktop'
  },
  {
    name: 'GitHub Release',
    provider: 'github' as const,
    owner: 'leaperone',
    repo: 'MultiPost-Desktop-Release'
  }
]

type UpdaterBroadcast = (channel: string, payload: unknown) => void

let mainWindow: BrowserWindow | null = null
let broadcastToUi: UpdaterBroadcast | null = null
let currentStatus: UpdateStatus = { status: 'idle' }
let currentSourceIndex = 0
let isManualCheck = false

function sendStatusToRenderer(status: UpdateStatus): void {
  currentStatus = status
  // App UI lives in BrowserViews (the main window only hosts a blank page),
  // so status must be broadcast to those webContents to be seen at all.
  if (broadcastToUi) {
    broadcastToUi(IPC_CHANNELS.UPDATER_STATUS, status)
    return
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(IPC_CHANNELS.UPDATER_STATUS, status)
  }
}

// 设置当前更新源
function setUpdateSource(index: number): void {
  const source = UPDATE_SOURCES[index]
  console.log(`[AutoUpdater] 使用更新源: ${source.name}`)

  if (source.provider === 'generic') {
    autoUpdater.setFeedURL({
      provider: 'generic',
      url: source.url
    })
  } else if (source.provider === 'github') {
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: source.owner,
      repo: source.repo
    })
  }
}

// 尝试下一个更新源
function tryNextSource(): boolean {
  currentSourceIndex++
  if (currentSourceIndex < UPDATE_SOURCES.length) {
    setUpdateSource(currentSourceIndex)
    return true
  }
  return false
}

// 重置更新源索引
function resetSourceIndex(): void {
  currentSourceIndex = 0
  setUpdateSource(0)
}

export function initAutoUpdater(window: BrowserWindow, broadcast?: UpdaterBroadcast): void {
  mainWindow = window
  broadcastToUi = broadcast ?? null

  // Configure auto-updater
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  // In development, use dev-app-update.yml
  if (is.dev) {
    autoUpdater.forceDevUpdateConfig = true
  }

  // 设置初始更新源
  setUpdateSource(0)

  // Event handlers
  autoUpdater.on('checking-for-update', () => {
    sendStatusToRenderer({ status: 'checking' })
  })

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    resetSourceIndex()
    sendStatusToRenderer({ status: 'available', info })
    isManualCheck = false
  })

  autoUpdater.on('update-not-available', (info: UpdateInfo) => {
    resetSourceIndex()
    sendStatusToRenderer({ status: 'not-available', info })
    if (isManualCheck) {
      dialog.showMessageBox({
        type: 'info',
        title: '检查更新',
        message: '当前已是最新版本',
        detail: `当前版本: ${app.getVersion()}`,
        buttons: ['确定']
      })
    }
    isManualCheck = false
  })

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    sendStatusToRenderer({
      status: 'downloading',
      progress
    })
  })

  autoUpdater.on('update-downloaded', (event: UpdateDownloadedEvent) => {
    resetSourceIndex()
    sendStatusToRenderer({
      status: 'downloaded',
      info: event
    })
  })

  autoUpdater.on('error', (error: Error) => {
    const currentSource = UPDATE_SOURCES[currentSourceIndex]
    console.error(`[AutoUpdater] 更新源 "${currentSource.name}" 错误: ${error.message}`)

    // 尝试下一个更新源
    if (tryNextSource()) {
      const nextSource = UPDATE_SOURCES[currentSourceIndex]
      console.log(`[AutoUpdater] 切换到备用更新源: ${nextSource.name}`)
      setTimeout(() => {
        autoUpdater.checkForUpdates().catch(() => {
          // fallback check failed, will trigger error handler again
        })
      }, 1000)
    } else {
      // 所有源都失败了
      console.error('[AutoUpdater] 所有更新源都失败了')
      resetSourceIndex()
      sendStatusToRenderer({
        status: 'error',
        error: error.message
      })
      if (isManualCheck) {
        dialog.showMessageBox({
          type: 'error',
          title: '检查更新',
          message: '检查更新失败',
          detail: error.message,
          buttons: ['确定']
        })
      }
      isManualCheck = false
    }
  })
}

export function registerUpdaterIpcHandlers(): void {
  // Check for updates
  ipcMain.handle(IPC_CHANNELS.UPDATER_CHECK, async () => {
    try {
      resetSourceIndex()
      const result = await autoUpdater.checkForUpdates()
      return result?.updateInfo
    } catch (error) {
      throw new Error(`Failed to check for updates: ${(error as Error).message}`)
    }
  })

  // Download update
  ipcMain.handle(IPC_CHANNELS.UPDATER_DOWNLOAD, async () => {
    try {
      await autoUpdater.downloadUpdate()
    } catch (error) {
      throw new Error(`Failed to download update: ${(error as Error).message}`)
    }
  })

  // Install update (quit and install)
  ipcMain.handle(IPC_CHANNELS.UPDATER_INSTALL, () => {
    autoUpdater.quitAndInstall(false, true)
  })

  // Get current update status
  ipcMain.handle(IPC_CHANNELS.UPDATER_GET_STATUS, () => {
    return currentStatus
  })

  ipcMain.handle(IPC_CHANNELS.UPDATER_GET_IGNORED, () => {
    return getIgnoredUpdateVersion()
  })

  // "Ignore this version" must only ever suppress the version currently being
  // offered. A renderer must not be trusted to pre-seed suppression for an
  // arbitrary version, so the requested value is accepted only when it matches
  // the version the updater is actively presenting.
  ipcMain.handle(IPC_CHANNELS.UPDATER_IGNORE, (_, version: string) => {
    const offered = currentStatus.info?.version
    const isOffering =
      currentStatus.status === 'available' || currentStatus.status === 'downloaded'
    if (
      !isOffering ||
      !offered ||
      normalizeIgnoredUpdateVersion(version) !== normalizeIgnoredUpdateVersion(offered)
    ) {
      return getIgnoredUpdateVersion()
    }
    return setIgnoredUpdateVersion(offered)
  })
}

// 手动检查更新（菜单触发，无更新时弹窗提示）
export function checkForUpdates(): void {
  isManualCheck = true
  resetSourceIndex()
  autoUpdater.checkForUpdates().catch(() => {
    // error handler will try fallback sources
  })
}

// 静默检查更新（启动时调用，带 fallback 支持）
export function checkForUpdatesSilently(): void {
  resetSourceIndex()
  autoUpdater.checkForUpdates().catch(() => {
    // Silently ignore - error handler will try fallback sources
  })
}
