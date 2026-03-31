/**
 * WebView Preload Script
 *
 * 专门用于主站 WebView 的 preload 脚本
 * 暴露 window.multipost API 供 Web 页面调用
 */

import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/constants'
import type {
  Account,
  AccountGroup,
  Draft,
  FileData,
  PublishHistory,
  ScheduledPublish,
  PlatformInfo,
  PlatformType,
  SyncContentType,
  SyncContentData,
  UpdateInfo,
  BrowserTab,
  GroupTab,
  PublishGroup
} from '../shared/types'

// 事件监听器存储
type EventCallback = (...args: unknown[]) => void
const eventListeners: Map<string, Set<EventCallback>> = new Map()

// 内部事件处理
function setupEventListeners() {
  // 账号登录事件
  ipcRenderer.on('multipost:account:login', (_, data) => {
    emitEvent('account:login', data)
  })

  // 账号登出事件
  ipcRenderer.on('multipost:account:logout', (_, data) => {
    emitEvent('account:logout', data)
  })

  // 发布进度事件
  ipcRenderer.on('multipost:publish:progress', (_, data) => {
    emitEvent('publish:progress', data)
  })

  // 发布完成事件
  ipcRenderer.on('multipost:publish:complete', (_, data) => {
    emitEvent('publish:complete', data)
  })

  // 发布错误事件
  ipcRenderer.on('multipost:publish:error', (_, data) => {
    emitEvent('publish:error', data)
  })

  // 更新可用事件
  ipcRenderer.on('multipost:update:available', (_, data) => {
    emitEvent('update:available', data)
  })

  // 更新已下载事件
  ipcRenderer.on('multipost:update:downloaded', (_, data) => {
    emitEvent('update:downloaded', data)
  })

  // 窗口大小变化事件
  ipcRenderer.on('multipost:window:resize', (_, data) => {
    emitEvent('window:resize', data)
  })

  // 浏览器 tab 变化事件
  ipcRenderer.on('multipost:browser:tabsChanged', (_, data) => {
    emitEvent('browser:tabsChanged', data)
  })
}

function emitEvent(event: string, data: unknown) {
  const listeners = eventListeners.get(event)
  if (listeners) {
    listeners.forEach((callback) => {
      try {
        callback(data)
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error)
      }
    })
  }
}

// 初始化事件监听
setupEventListeners()

// MultiPost Bridge API
const multipost = {
  // 环境信息
  env: {
    isDesktop: true,
    version: '', // 将在初始化时填充
    platform: process.platform as 'darwin' | 'win32' | 'linux'
  },

  // 账号管理 API
  account: {
    list: (filters?: { platform?: PlatformType; groupId?: string }): Promise<Account[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.ACCOUNT_LIST, filters),

    get: (id: string): Promise<Account | null> => ipcRenderer.invoke(IPC_CHANNELS.ACCOUNT_GET, id),

    create: (platform: PlatformType): Promise<Account> =>
      ipcRenderer.invoke(IPC_CHANNELS.ACCOUNT_CREATE, platform),

    update: (id: string, data: Partial<Account>): Promise<Account> =>
      ipcRenderer.invoke(IPC_CHANNELS.ACCOUNT_UPDATE, id, data),

    delete: (id: string): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.ACCOUNT_DELETE, id),

    setDefault: (id: string): Promise<void> =>
      ipcRenderer.invoke('multipost:account:setDefault', id),

    checkLoginStatus: (id: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.BROWSER_GET_LOGIN_STATUS, id),

    openLogin: (id: string): Promise<void> => {
      console.log('[WebView Preload] openLogin called with id:', id)
      console.log('[WebView Preload] IPC channel:', IPC_CHANNELS.BROWSER_OPEN)
      return ipcRenderer.invoke(IPC_CHANNELS.BROWSER_OPEN, id).then(() => {
        console.log('[WebView Preload] openLogin IPC success')
      }).catch((err) => {
        console.error('[WebView Preload] openLogin IPC error:', err)
        throw err
      })
    }
  },

  // 账号分组 API
  group: {
    list: (): Promise<AccountGroup[]> => ipcRenderer.invoke(IPC_CHANNELS.GROUP_LIST),

    get: (id: string): Promise<AccountGroup | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.GROUP_GET, id),

    create: (data: { name: string; color?: string }): Promise<AccountGroup> =>
      ipcRenderer.invoke(IPC_CHANNELS.GROUP_CREATE, data),

    update: (id: string, data: Partial<AccountGroup>): Promise<AccountGroup> =>
      ipcRenderer.invoke(IPC_CHANNELS.GROUP_UPDATE, id, data),

    delete: (id: string): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.GROUP_DELETE, id)
  },

  // 浏览器控制 API
  browser: {
    open: (accountId: string, url?: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.BROWSER_OPEN, accountId, url),

    close: (accountId: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.BROWSER_CLOSE, accountId),

    show: (accountId: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.BROWSER_SHOW, accountId),

    hide: (accountId: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.BROWSER_HIDE, accountId),

    navigate: (accountId: string, url: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.BROWSER_NAVIGATE, accountId, url),

    execute: (accountId: string, script: string): Promise<unknown> =>
      ipcRenderer.invoke(IPC_CHANNELS.BROWSER_EXECUTE, accountId, script),

    getLoginStatus: (
      accountId: string
    ): Promise<{ isLoggedIn: boolean; userInfo?: { username: string; avatar?: string } }> =>
      ipcRenderer.invoke('multipost:browser:getLoginStatusWithInfo', accountId),

    // Tab 管理 API
    getTabs: (): Promise<BrowserTab[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.BROWSER_TAB_LIST),

    switchTab: (accountId: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.BROWSER_TAB_SWITCH, accountId),

    closeTab: (accountId: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.BROWSER_TAB_CLOSE, accountId),

    tabGoBack: (accountId: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.BROWSER_TAB_GO_BACK, accountId),

    tabGoForward: (accountId: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.BROWSER_TAB_GO_FORWARD, accountId),

    tabRefresh: (accountId: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.BROWSER_TAB_REFRESH, accountId)
  },

  // 发布 API
  publish: {
    start: (params: {
      contentType: SyncContentType
      accountId: string
      data: SyncContentData
      autoSubmit?: boolean
    }): Promise<{ success: boolean; platformPostId?: string; platformPostUrl?: string; error?: string }> =>
      ipcRenderer.invoke('multipost:publish:start', params),

    startInExecutor: (params: {
      contentType: SyncContentType
      targets: Array<{ accountId: string; platform: PlatformType; displayName?: string }>
      data: SyncContentData
      autoSubmit?: boolean
    }): Promise<void> => ipcRenderer.invoke('multipost:publish:startInExecutor', params),

    getStatus: (
      taskId: string
    ): Promise<'idle' | 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'> =>
      ipcRenderer.invoke('multipost:publish:getStatus', taskId),

    cancel: (taskId: string): Promise<void> => ipcRenderer.invoke('multipost:publish:cancel', taskId)
  },

  // 草稿 API
  draft: {
    list: (): Promise<Draft[]> => ipcRenderer.invoke(IPC_CHANNELS.DRAFT_LIST),

    get: (id: string): Promise<Draft | null> => ipcRenderer.invoke(IPC_CHANNELS.DRAFT_GET, id),

    create: (data: Omit<Draft, 'id' | 'createdAt' | 'updatedAt'>): Promise<Draft> =>
      ipcRenderer.invoke(IPC_CHANNELS.DRAFT_CREATE, data),

    update: (id: string, data: Partial<Draft>): Promise<Draft> =>
      ipcRenderer.invoke(IPC_CHANNELS.DRAFT_UPDATE, id, data),

    delete: (id: string): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.DRAFT_DELETE, id)
  },

  // 发布历史 API
  history: {
    list: (options?: { limit?: number; offset?: number }): Promise<PublishHistory[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.HISTORY_LIST, options),

    get: (id: string): Promise<PublishHistory | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.HISTORY_GET, id),

    delete: (id: string): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.HISTORY_DELETE, id)
  },

  // 定时发布 API
  scheduled: {
    list: (): Promise<ScheduledPublish[]> => ipcRenderer.invoke(IPC_CHANNELS.SCHEDULED_LIST),

    get: (id: string): Promise<ScheduledPublish | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.SCHEDULED_GET, id),

    create: (
      data: Omit<ScheduledPublish, 'id' | 'createdAt' | 'updatedAt' | 'status'>
    ): Promise<ScheduledPublish> => ipcRenderer.invoke(IPC_CHANNELS.SCHEDULED_CREATE, data),

    update: (id: string, data: Partial<ScheduledPublish>): Promise<ScheduledPublish> =>
      ipcRenderer.invoke(IPC_CHANNELS.SCHEDULED_UPDATE, id, data),

    delete: (id: string): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.SCHEDULED_DELETE, id),

    cancel: (id: string): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.SCHEDULED_CANCEL, id)
  },

  // 应用 API
  app: {
    getVersion: (): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_VERSION),

    getPlatforms: (): Promise<PlatformInfo[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.APP_GET_PLATFORMS),

    checkUpdate: (): Promise<UpdateInfo | null> => ipcRenderer.invoke(IPC_CHANNELS.UPDATER_CHECK),

    downloadUpdate: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.UPDATER_DOWNLOAD),

    installUpdate: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.UPDATER_INSTALL),

    openExternal: (url: string): Promise<void> =>
      ipcRenderer.invoke('multipost:app:openExternal', url),

    selectFile: (options?: {
      filters?: { name: string; extensions: string[] }[]
      multiple?: boolean
    }): Promise<string[]> => ipcRenderer.invoke(IPC_CHANNELS.APP_SELECT_FILE, options),

    selectDirectory: (): Promise<string | null> =>
      ipcRenderer.invoke('multipost:app:selectDirectory'),

    readFileAsDataURL: (filePath: string): Promise<string> =>
      ipcRenderer.invoke(IPC_CHANNELS.APP_READ_FILE_AS_DATA_URL, filePath),

    getFileInfo: (filePath: string): Promise<FileData> =>
      ipcRenderer.invoke(IPC_CHANNELS.APP_GET_FILE_INFO, filePath)
  },

  // 布局 API
  layout: {
    setSidebarWidth: (width: number): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.LAYOUT_SET_SIDEBAR_WIDTH, width),

    getWindowSize: (): Promise<{ width: number; height: number }> =>
      ipcRenderer.invoke('multipost:layout:getWindowSize'),

    minimize: (): Promise<void> => ipcRenderer.invoke('multipost:layout:minimize'),

    maximize: (): Promise<void> => ipcRenderer.invoke('multipost:layout:maximize'),

    close: (): Promise<void> => ipcRenderer.invoke('multipost:layout:close')
  },

  // 导航 API
  navigation: {
    reportPath: (path: string): void => {
      ipcRenderer.send('multipost:navigation:reportPath', path)
    },

    navigateTo: (path: string): void => {
      ipcRenderer.send('multipost:navigation:navigateTo', path)
    }
  },

  // Publish Group API - 发布 Group 管理
  publishGroup: {
    create: (params: {
      contentType: SyncContentType
      targets: Array<{ accountId: string; platform: PlatformType; displayName: string }>
      data: SyncContentData
    }): Promise<string> => ipcRenderer.invoke('multipost:publishGroup:create', params),

    show: (groupId: string): Promise<void> =>
      ipcRenderer.invoke('multipost:publishGroup:show', groupId),

    switchTab: (groupId: string, accountId: string): Promise<void> =>
      ipcRenderer.invoke('multipost:publishGroup:switchTab', groupId, accountId),

    close: (groupId: string): Promise<void> =>
      ipcRenderer.invoke('multipost:publishGroup:close', groupId),

    getTabs: (groupId: string): Promise<GroupTab[]> =>
      ipcRenderer.invoke('multipost:publishGroup:getTabs', groupId),

    get: (groupId: string): Promise<PublishGroup | null> =>
      ipcRenderer.invoke('multipost:publishGroup:get', groupId),

    fill: (groupId: string): Promise<void> =>
      ipcRenderer.invoke('multipost:publishGroup:fill', groupId),

    submitAll: (groupId: string): Promise<void> =>
      ipcRenderer.invoke('multipost:publishGroup:submitAll', groupId),

    getActiveGroupId: (): Promise<string | null> =>
      ipcRenderer.invoke('multipost:publishGroup:getActiveGroupId')
  },

  // 事件系统
  on: (event: string, callback: EventCallback): void => {
    if (!eventListeners.has(event)) {
      eventListeners.set(event, new Set())
    }
    eventListeners.get(event)!.add(callback)
  },

  off: (event: string, callback: EventCallback): void => {
    const listeners = eventListeners.get(event)
    if (listeners) {
      listeners.delete(callback)
    }
  }
}

// 初始化版本号
ipcRenderer
  .invoke(IPC_CHANNELS.APP_GET_VERSION)
  .then((version) => {
    multipost.env.version = version
  })
  .catch(() => {
    multipost.env.version = 'unknown'
  })

// 暴露 API 到 window.multipost
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('multipost', multipost)
  } catch (error) {
    console.error('Failed to expose multipost API:', error)
  }
} else {
  ;(window as unknown as { multipost: typeof multipost }).multipost = multipost
}

export type MultiPostBridge = typeof multipost
