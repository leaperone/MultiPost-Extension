import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPC_CHANNELS } from '../shared/constants'
import type {
  Account,
  AccountGroup,
  BrowserTab,
  Draft,
  FileData,
  PublishHistory,
  PublishHistoryStatus,
  ScheduledPublish,
  ScheduledPublishStatus,
  PlatformInfo,
  PlatformType,
  ProxyConfig,
  PublishTask,
  TaskStatus,
  SyncContentType,
  SyncContentData,
  PublishEventPayload,
  UpdateStatus,
  UpdateInfo,
  GroupTab,
  PublishGroup,
  KeepAliveStatus
} from '../shared/types'

// Custom APIs for renderer
const api = {
  // Account group management
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

  // Account management
  account: {
    list: (filters?: { platform?: PlatformType; groupId?: string }): Promise<Account[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.ACCOUNT_LIST, filters),
    get: (id: string): Promise<Account | null> => ipcRenderer.invoke(IPC_CHANNELS.ACCOUNT_GET, id),
    create: (platform: PlatformType, options?: { proxyConfig?: ProxyConfig }): Promise<Account> =>
      ipcRenderer.invoke(IPC_CHANNELS.ACCOUNT_CREATE, platform, options),
    delete: (id: string): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.ACCOUNT_DELETE, id),
    update: (id: string, data: Partial<Account>): Promise<Account> =>
      ipcRenderer.invoke(IPC_CHANNELS.ACCOUNT_UPDATE, id, data),
    setDefault: (id: string, platform: PlatformType): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.ACCOUNT_SET_DEFAULT, id, platform)
  },

  // Browser view management
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
    getLoginStatus: (accountId: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.BROWSER_GET_LOGIN_STATUS, accountId),

    // Events from main process
    onNavigated: (callback: (data: { accountId: string; url: string }) => void) => {
      const listener = (_: Electron.IpcRendererEvent, data: { accountId: string; url: string }) =>
        callback(data)
      ipcRenderer.on('browser:navigated', listener)
      return () => ipcRenderer.removeListener('browser:navigated', listener)
    },
    onTitleChanged: (callback: (data: { accountId: string; title: string }) => void) => {
      const listener = (_: Electron.IpcRendererEvent, data: { accountId: string; title: string }) =>
        callback(data)
      ipcRenderer.on('browser:titleChanged', listener)
      return () => ipcRenderer.removeListener('browser:titleChanged', listener)
    },

    // Tab management
    getTabs: (): Promise<BrowserTab[]> => ipcRenderer.invoke(IPC_CHANNELS.BROWSER_TAB_LIST),
    switchTab: (accountId: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.BROWSER_TAB_SWITCH, accountId),
    switchToHome: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.BROWSER_TAB_SWITCH_HOME),
    closeTab: (accountId: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.BROWSER_TAB_CLOSE, accountId),
    tabNavigate: (tabId: string, url: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.BROWSER_TAB_NAVIGATE, tabId, url),
    tabGoBack: (accountId: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.BROWSER_TAB_GO_BACK, accountId),
    tabGoForward: (accountId: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.BROWSER_TAB_GO_FORWARD, accountId),
    tabRefresh: (accountId: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.BROWSER_TAB_REFRESH, accountId),
    onTabsChanged: (callback: (tabs: BrowserTab[]) => void) => {
      const listener = (_: Electron.IpcRendererEvent, tabs: BrowserTab[]) => callback(tabs)
      ipcRenderer.on('multipost:browser:tabsChanged', listener)
      return () => ipcRenderer.removeListener('multipost:browser:tabsChanged', listener)
    }
  },

  // Task management
  task: {
    create: (task: Omit<PublishTask, 'id' | 'createdAt' | 'updatedAt'>): Promise<PublishTask> =>
      ipcRenderer.invoke(IPC_CHANNELS.TASK_CREATE, task),
    list: (filters?: { platform?: PlatformType; status?: TaskStatus }): Promise<PublishTask[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.TASK_LIST, filters),
    get: (id: string): Promise<PublishTask | null> => ipcRenderer.invoke(IPC_CHANNELS.TASK_GET, id),
    update: (id: string, data: Partial<PublishTask>): Promise<PublishTask> =>
      ipcRenderer.invoke(IPC_CHANNELS.TASK_UPDATE, id, data),
    delete: (id: string): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.TASK_DELETE, id)
  },

  // Publish (simple mode - without account binding)
  publish: {
    start: (
      platform: PlatformType,
      contentType: SyncContentType,
      data: SyncContentData,
      autoSubmit?: boolean
    ): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.PUBLISH_START, platform, contentType, data, autoSubmit),
    // Now takes accountId instead of platform for multi-account support
    startInExecutor: (
      accountId: string,
      contentType: SyncContentType,
      data: SyncContentData,
      autoSubmit?: boolean
    ): Promise<void> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.PUBLISH_START_IN_EXECUTOR,
        accountId,
        contentType,
        data,
        autoSubmit
      ),
    onProgress: (callback: (payload: PublishEventPayload) => void) => {
      const listener = (_: Electron.IpcRendererEvent, payload: PublishEventPayload) => callback(payload)
      ipcRenderer.on('multipost:publish:progress', listener)
      return () => ipcRenderer.removeListener('multipost:publish:progress', listener)
    },
    onComplete: (callback: (payload: PublishEventPayload) => void) => {
      const listener = (_: Electron.IpcRendererEvent, payload: PublishEventPayload) => callback(payload)
      ipcRenderer.on('multipost:publish:complete', listener)
      return () => ipcRenderer.removeListener('multipost:publish:complete', listener)
    },
    onError: (callback: (payload: PublishEventPayload) => void) => {
      const listener = (_: Electron.IpcRendererEvent, payload: PublishEventPayload) => callback(payload)
      ipcRenderer.on('multipost:publish:error', listener)
      return () => ipcRenderer.removeListener('multipost:publish:error', listener)
    }
  },

  // Platform browser controls (simple mode)
  platform: {
    open: (platform: PlatformType, contentType?: SyncContentType): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.PLATFORM_OPEN, platform, contentType),
    switch: (platform: PlatformType): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.PLATFORM_SWITCH, platform),
    close: (platform: PlatformType): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.PLATFORM_CLOSE, platform),
    hide: (platform: PlatformType): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.PLATFORM_HIDE, platform),
    hideAll: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.PLATFORM_HIDE_ALL),
    closeAll: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.PLATFORM_CLOSE_ALL),
    list: (): Promise<PlatformType[]> => ipcRenderer.invoke(IPC_CHANNELS.PLATFORM_LIST),
    back: (platform: PlatformType): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.PLATFORM_BACK, platform),
    forward: (platform: PlatformType): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.PLATFORM_FORWARD, platform),
    refresh: (platform: PlatformType): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.PLATFORM_REFRESH, platform)
  },

  // Executor browser controls - now keyed by accountId for multi-account support
  executor: {
    // Open executor for a saved account (uses account's session partition)
    open: (accountId: string, contentType?: SyncContentType): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.EXECUTOR_OPEN, accountId, contentType),
    // Open executor for "other platforms" (uses default persistent session: persist:${platform}-default)
    // executorId format: default-${platform}
    openDefault: (platform: PlatformType, contentType?: SyncContentType): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.EXECUTOR_OPEN_DEFAULT, platform, contentType),
    show: (accountId: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.EXECUTOR_SHOW, accountId),
    hide: (accountId: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.EXECUTOR_HIDE, accountId),
    hideAll: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.EXECUTOR_HIDE_ALL),
    close: (accountId: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.EXECUTOR_CLOSE, accountId),
    // Returns array of { accountId, platform } for all open executors
    list: (): Promise<Array<{ accountId: string; platform: PlatformType }>> =>
      ipcRenderer.invoke(IPC_CHANNELS.EXECUTOR_LIST)
  },

  // App info
  app: {
    getVersion: (): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_VERSION),
    getPlatforms: (): Promise<PlatformInfo[]> => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_PLATFORMS),
    getFileInfo: (filePath: string): Promise<FileData> =>
      ipcRenderer.invoke(IPC_CHANNELS.APP_GET_FILE_INFO, filePath),
    selectFile: (options?: {
      filters?: { name: string; extensions: string[] }[]
      multiple?: boolean
    }): Promise<string[]> => ipcRenderer.invoke(IPC_CHANNELS.APP_SELECT_FILE, options)
  },

  // Layout
  layout: {
    setSidebarWidth: (width: number): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.LAYOUT_SET_SIDEBAR_WIDTH, width)
  },

  // Updater
  updater: {
    checkForUpdates: (): Promise<UpdateInfo | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.UPDATER_CHECK),
    downloadUpdate: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.UPDATER_DOWNLOAD),
    installUpdate: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.UPDATER_INSTALL),
    getStatus: (): Promise<UpdateStatus> => ipcRenderer.invoke(IPC_CHANNELS.UPDATER_GET_STATUS),
    onStatusChange: (callback: (status: UpdateStatus) => void) => {
      const listener = (_: Electron.IpcRendererEvent, status: UpdateStatus) => callback(status)
      ipcRenderer.on(IPC_CHANNELS.UPDATER_STATUS, listener)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.UPDATER_STATUS, listener)
    }
  },

  // Draft management
  draft: {
    list: (contentType?: SyncContentType): Promise<Draft[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.DRAFT_LIST, contentType),
    get: (id: string): Promise<Draft | null> => ipcRenderer.invoke(IPC_CHANNELS.DRAFT_GET, id),
    create: (data: Omit<Draft, 'id' | 'createdAt' | 'updatedAt'>): Promise<Draft> =>
      ipcRenderer.invoke(IPC_CHANNELS.DRAFT_CREATE, data),
    update: (id: string, data: Partial<Draft>): Promise<Draft> =>
      ipcRenderer.invoke(IPC_CHANNELS.DRAFT_UPDATE, id, data),
    delete: (id: string): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.DRAFT_DELETE, id)
  },

  // Publish history
  history: {
    list: (filters?: {
      platform?: PlatformType
      status?: PublishHistoryStatus
      limit?: number
      offset?: number
    }): Promise<PublishHistory[]> => ipcRenderer.invoke(IPC_CHANNELS.HISTORY_LIST, filters),
    get: (id: string): Promise<PublishHistory | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.HISTORY_GET, id),
    create: (data: Omit<PublishHistory, 'id' | 'createdAt'>): Promise<PublishHistory> =>
      ipcRenderer.invoke(IPC_CHANNELS.HISTORY_CREATE, data),
    update: (id: string, data: Partial<PublishHistory>): Promise<PublishHistory> =>
      ipcRenderer.invoke(IPC_CHANNELS.HISTORY_UPDATE, id, data),
    delete: (id: string): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.HISTORY_DELETE, id)
  },

  // Scheduled publish
  scheduled: {
    list: (filters?: {
      status?: ScheduledPublishStatus
      beforeTime?: number
    }): Promise<ScheduledPublish[]> => ipcRenderer.invoke(IPC_CHANNELS.SCHEDULED_LIST, filters),
    get: (id: string): Promise<ScheduledPublish | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.SCHEDULED_GET, id),
    create: (data: Omit<ScheduledPublish, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScheduledPublish> =>
      ipcRenderer.invoke(IPC_CHANNELS.SCHEDULED_CREATE, data),
    update: (id: string, data: Partial<ScheduledPublish>): Promise<ScheduledPublish> =>
      ipcRenderer.invoke(IPC_CHANNELS.SCHEDULED_UPDATE, id, data),
    delete: (id: string): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.SCHEDULED_DELETE, id),
    cancel: (id: string): Promise<ScheduledPublish | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.SCHEDULED_CANCEL, id)
  },

  // Main WebView control (for hybrid architecture)
  webview: {
    // Navigate to a path in the main WebView
    navigateTo: (path: string): void => {
      ipcRenderer.send('multipost:navigation:navigateTo', path)
    },
    // Show the main WebView
    show: (): void => {
      ipcRenderer.send('multipost:webview:show')
    },
    // Hide the main WebView
    hide: (): void => {
      ipcRenderer.send('multipost:webview:hide')
    },
    // Listen for path changes from WebView
    onPathChanged: (callback: (path: string) => void) => {
      const listener = (_: Electron.IpcRendererEvent, path: string) => callback(path)
      ipcRenderer.on('webview:path-changed', listener)
      return () => ipcRenderer.removeListener('webview:path-changed', listener)
    }
  },

  // Publish Group management
  publishGroup: {
    create: (params: {
      contentType: SyncContentType
      targets: Array<{ accountId: string; platform: PlatformType; displayName: string }>
      data: SyncContentData
      autoPublish?: boolean
    }): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.PUBLISH_GROUP_CREATE, params),

    show: (groupId: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.PUBLISH_GROUP_SHOW, groupId),

    switchTab: (groupId: string, accountId: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.PUBLISH_GROUP_SWITCH_TAB, groupId, accountId),

    closeTab: (groupId: string, accountId: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.PUBLISH_GROUP_CLOSE_TAB, groupId, accountId),

    close: (groupId: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.PUBLISH_GROUP_CLOSE, groupId),

    getTabs: (groupId: string): Promise<GroupTab[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.PUBLISH_GROUP_GET_TABS, groupId),

    get: (groupId: string): Promise<PublishGroup | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.PUBLISH_GROUP_GET, groupId),

    list: (): Promise<PublishGroup[]> => ipcRenderer.invoke(IPC_CHANNELS.PUBLISH_GROUP_LIST),

    fill: (groupId: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.PUBLISH_GROUP_FILL, groupId),

    submitOne: (groupId: string, accountId: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.PUBLISH_GROUP_SUBMIT_ONE, groupId, accountId),

    submitAll: (groupId: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.PUBLISH_GROUP_SUBMIT_ALL, groupId),

    // Events
    onGroupTabsChanged: (
      callback: (data: { groupId: string; tabs: GroupTab[]; status?: string }) => void
    ) => {
      const listener = (
        _: Electron.IpcRendererEvent,
        data: { groupId: string; tabs: GroupTab[]; status?: string }
      ) => callback(data)
      ipcRenderer.on('multipost:browser:groupTabsChanged', listener)
      return () => ipcRenderer.removeListener('multipost:browser:groupTabsChanged', listener)
    }
  },

  // KeepAlive
  keepAlive: {
    getStatus: (): Promise<KeepAliveStatus> =>
      ipcRenderer.invoke(IPC_CHANNELS.KEEPALIVE_GET_STATUS),
    trigger: (): Promise<KeepAliveStatus> => ipcRenderer.invoke(IPC_CHANNELS.KEEPALIVE_TRIGGER)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  ;(window as unknown as { electron: typeof electronAPI }).electron = electronAPI
  ;(window as unknown as { api: typeof api }).api = api
}

export type Api = typeof api
