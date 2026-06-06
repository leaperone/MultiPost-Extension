import { IpcMain, app, dialog } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { IPC_CHANNELS, PLATFORMS } from '../../shared/constants'
import { getMimeType } from '../utils/mime'
import {
  createLocalFileUrl,
  type Account,
  type AccountGroup,
  type Draft,
  type PublishHistory,
  type PublishHistoryStatus,
  type ScheduledPublish,
  type PlatformType,
  type ProxyConfig,
  type PublishTask,
  type TaskStatus,
  type SyncContentType,
  type SyncContentData,
  type PublishTargetStatus,
  type PublishBridgeEnvelope,
  type PublishStatusSnapshot,
  type PublishTargetResult
} from '../../shared/types'
import { BrowserViewManager } from '../browser/browserViewManager'
import { DatabaseService } from '../database'
import type { KeepAliveService } from '../keepalive'
import { normalizeProxyConfig } from '../proxy/accountProxy'

type BrowserViewManagerGetter = () => BrowserViewManager | null

function formatIpcError(error: unknown): string {
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

function publishEnvelope<TData>(
  code: number,
  message: string,
  data: TData,
  results?: PublishTargetResult[]
): PublishBridgeEnvelope<TData> {
  return {
    code,
    message,
    data,
    success: code === 0,
    error: code === 0 ? undefined : message,
    results
  }
}

function publishSuccess<TData>(
  message: string,
  data: TData,
  results?: PublishTargetResult[]
): PublishBridgeEnvelope<TData> {
  return publishEnvelope(0, message, data, results)
}

function publishError<TData>(
  error: unknown,
  data: TData,
  results?: PublishTargetResult[],
  code = 1
): PublishBridgeEnvelope<TData> {
  return publishEnvelope(code, formatIpcError(error), data, results)
}

function snapshotHasFailure(snapshot: PublishStatusSnapshot): boolean {
  return snapshot.targets.some((target) => target.status === 'failed')
}

function snapshotWasCancelled(snapshot: PublishStatusSnapshot): boolean {
  return snapshot.status === 'cancelled' || snapshot.targets.some((target) => target.status === 'cancelled')
}

function hasOwnProperty<T extends object, K extends PropertyKey>(
  value: T,
  key: K
): value is T & Record<K, unknown> {
  return Object.prototype.hasOwnProperty.call(value, key)
}

function formatAccountForLog(
  account: Pick<Account, 'id' | 'platform' | 'proxyConfig'> | null | undefined
): { id: string; platform: PlatformType; hasProxyConfig: boolean } | null {
  if (!account) {
    return null
  }
  return {
    id: account.id,
    platform: account.platform,
    hasProxyConfig: Boolean(account.proxyConfig)
  }
}

export function registerIpcHandlers(
  ipcMain: IpcMain,
  getBrowserViewManager: BrowserViewManagerGetter,
  keepAliveService: KeepAliveService
): void {
  const db = DatabaseService.getInstance()

  // ========== Account Group Handlers ==========

  ipcMain.handle(IPC_CHANNELS.GROUP_LIST, async () => {
    return db.listAccountGroups()
  })

  ipcMain.handle(IPC_CHANNELS.GROUP_GET, async (_, id: string) => {
    return db.getAccountGroup(id)
  })

  ipcMain.handle(IPC_CHANNELS.GROUP_CREATE, async (_, data: { name: string; color?: string }) => {
    const now = Date.now()
    const groups = db.listAccountGroups()
    const group: AccountGroup = {
      id: uuidv4(),
      name: data.name,
      color: data.color,
      order: groups.length,
      createdAt: now,
      updatedAt: now
    }
    return db.createAccountGroup(group)
  })

  ipcMain.handle(
    IPC_CHANNELS.GROUP_UPDATE,
    async (_, id: string, data: Partial<AccountGroup>) => {
      return db.updateAccountGroup(id, data)
    }
  )

  ipcMain.handle(IPC_CHANNELS.GROUP_DELETE, async (_, id: string) => {
    db.deleteAccountGroup(id)
  })

  // ========== Account Handlers ==========

  ipcMain.handle(
    IPC_CHANNELS.ACCOUNT_LIST,
    async (_, filters?: { platform?: PlatformType; groupId?: string }) => {
      return db.listAccounts(filters)
    }
  )

  ipcMain.handle(IPC_CHANNELS.ACCOUNT_GET, async (_, id: string) => {
    return db.getAccount(id)
  })

  ipcMain.handle(
    IPC_CHANNELS.ACCOUNT_CREATE,
    async (_, platform: PlatformType, options?: { proxyConfig?: ProxyConfig }) => {
      const now = Date.now()
      const accountId = uuidv4()
      const account: Account = {
        id: accountId,
        platform,
        username: `${platform}_user`,
        isLoggedIn: false,
        sessionPartition: `persist:account-${accountId}`,
        proxyConfig: normalizeProxyConfig(options?.proxyConfig),
        isDefault: false,
        createdAt: now,
        updatedAt: now
      }
      return db.createAccount(account)
    }
  )

  ipcMain.handle(IPC_CHANNELS.ACCOUNT_DELETE, async (_, id: string) => {
    // Close any open browser views for this account
    const manager = getBrowserViewManager()
    if (manager) {
      await manager.closeView(id)
    }
    db.deleteAccount(id)
  })

  ipcMain.handle(IPC_CHANNELS.ACCOUNT_UPDATE, async (_, id: string, data: Partial<Account>) => {
    const hasProxyConfigUpdate = hasOwnProperty(data, 'proxyConfig')
    const updateData: Partial<Account> = { ...data }
    if (hasProxyConfigUpdate) {
      updateData.proxyConfig = normalizeProxyConfig(data.proxyConfig)
    }

    const updated = db.updateAccount(id, updateData)
    if (updated && hasProxyConfigUpdate) {
      await getBrowserViewManager()?.reapplyAccountProxy(id)
    }
    return updated
  })

  ipcMain.handle(
    IPC_CHANNELS.ACCOUNT_SET_DEFAULT,
    async (_, id: string, platform: PlatformType) => {
      db.setDefaultAccount(id, platform)
    }
  )

  // Browser handlers
  ipcMain.handle(
    IPC_CHANNELS.BROWSER_OPEN,
    async (_, accountId: string, url?: string) => {
      console.log('[IPC] BROWSER_OPEN called:', { accountId, hasUrl: Boolean(url) })
      const manager = getBrowserViewManager()
      console.log('[IPC] BrowserViewManager:', manager ? 'initialized' : 'null')
      if (!manager) throw new Error('BrowserViewManager not initialized')

      const account = db.getAccount(accountId)
      console.log('[IPC] BROWSER_OPEN account:', formatAccountForLog(account))
      if (!account) throw new Error(`Account not found: ${accountId}`)

      await manager.openView(accountId, account.platform, url)
      console.log('[IPC] BROWSER_OPEN completed')
    }
  )

  ipcMain.handle(IPC_CHANNELS.BROWSER_CLOSE, async (_, accountId: string) => {
    const manager = getBrowserViewManager()
    if (!manager) throw new Error('BrowserViewManager not initialized')
    await manager.closeView(accountId)
  })

  ipcMain.handle(IPC_CHANNELS.BROWSER_SHOW, async (_, accountId: string) => {
    const manager = getBrowserViewManager()
    if (!manager) throw new Error('BrowserViewManager not initialized')
    await manager.showView(accountId)
  })

  ipcMain.handle(IPC_CHANNELS.BROWSER_HIDE, async (_, accountId: string) => {
    const manager = getBrowserViewManager()
    if (!manager) throw new Error('BrowserViewManager not initialized')
    await manager.hideView(accountId)
  })

  ipcMain.handle(
    IPC_CHANNELS.BROWSER_NAVIGATE,
    async (_, accountId: string, url: string) => {
      const manager = getBrowserViewManager()
      if (!manager) throw new Error('BrowserViewManager not initialized')
      await manager.navigate(accountId, url)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.BROWSER_EXECUTE,
    async (_, accountId: string, script: string) => {
      const manager = getBrowserViewManager()
      if (!manager) throw new Error('BrowserViewManager not initialized')
      return manager.executeScript(accountId, script)
    }
  )

  ipcMain.handle(IPC_CHANNELS.BROWSER_GET_LOGIN_STATUS, async (_, accountId: string) => {
    console.log('[IPC] BROWSER_GET_LOGIN_STATUS called for:', accountId)
    const manager = getBrowserViewManager()
    if (!manager) throw new Error('BrowserViewManager not initialized')

    const account = db.getAccount(accountId)
    if (!account) throw new Error(`Account not found: ${accountId}`)

    const isLoggedIn = await manager.getLoginStatus(accountId, account.platform)
    console.log('[IPC] Login status result:', isLoggedIn)

    // Update account in database
    if (account.isLoggedIn !== isLoggedIn) {
      db.updateAccount(accountId, { isLoggedIn })
      console.log('[IPC] Updated account isLoggedIn to:', isLoggedIn)
    }

    // Fetch real user info when logged in and info is missing
    if (isLoggedIn && (!account.displayName || !account.avatar)) {
      try {
        const userInfo = await manager.fetchUserInfo(accountId, account.platform)
        if (userInfo) {
          db.updateAccount(accountId, {
            username: userInfo.username,
            displayName: userInfo.displayName,
            avatar: userInfo.avatar
          })
          console.log('[IPC] Updated account user info:', userInfo)
        }
      } catch (e) {
        console.error('[IPC] Failed to fetch user info:', e)
      }
    }

    return isLoggedIn
  })

  // Task handlers
  ipcMain.handle(
    IPC_CHANNELS.TASK_CREATE,
    async (_, task: Omit<PublishTask, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = Date.now()
      const fullTask: PublishTask = {
        ...task,
        id: uuidv4(),
        createdAt: now,
        updatedAt: now
      }
      return db.createTask(fullTask)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.TASK_LIST,
    async (_, filters?: { platform?: PlatformType; status?: TaskStatus }) => {
      return db.listTasks(filters)
    }
  )

  ipcMain.handle(IPC_CHANNELS.TASK_GET, async (_, id: string) => {
    return db.getTask(id)
  })

  ipcMain.handle(
    IPC_CHANNELS.TASK_UPDATE,
    async (_, id: string, data: Partial<PublishTask>) => {
      return db.updateTask(id, data)
    }
  )

  ipcMain.handle(IPC_CHANNELS.TASK_DELETE, async (_, id: string) => {
    db.deleteTask(id)
  })

  // Publish handlers (simple mode - without account binding)
  ipcMain.handle(
    IPC_CHANNELS.PUBLISH_START,
    async (
      _,
      platform: PlatformType,
      contentType: SyncContentType,
      data: SyncContentData,
      autoSubmit?: boolean
    ) => {
      const manager = getBrowserViewManager()
      if (!manager) throw new Error('BrowserViewManager not initialized')

      // Open platform view with the correct content type
      await manager.openPlatformView(platform, contentType)

      // Wait for page to load
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Fill content based on content type
      const fillResult = await manager.fillPlatformContent(platform, contentType, data, autoSubmit === true)

      // Auto submit if enabled
      if (autoSubmit && !fillResult.skipAdapterSubmit) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        await manager.submitPlatformContent(platform, contentType)
      }
    }
  )

  // Publish in executor (uses executor views instead of platform views)
  // Now takes accountId instead of platform, since executors are keyed by account
  ipcMain.handle(
    IPC_CHANNELS.PUBLISH_START_IN_EXECUTOR,
    async (
      _,
      accountId: string,
      contentType: SyncContentType,
      data: SyncContentData,
      autoSubmit?: boolean
    ) => {
      const manager = getBrowserViewManager()
      if (!manager) throw new Error('BrowserViewManager not initialized')
      const executor = manager.getExecutorView(accountId)
      const taskId = executor
        ? manager.beginExecutorPublishRun({
            contentType,
            targets: [{ accountId, platform: executor.platform }]
          })
        : undefined

      // Wait for page to load
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Fill content in executor view (now keyed by accountId)
      const fillResult = await manager.fillExecutorContent(accountId, contentType, data, autoSubmit === true, taskId)

      // Auto submit if enabled
      if (autoSubmit && !fillResult.skipAdapterSubmit) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        await manager.submitExecutorContent(accountId, contentType, taskId)
      }
      if (taskId) {
        manager.finishExecutorPublishRun(taskId)
      }
    }
  )

  // Platform browser handlers (simple mode)
  ipcMain.handle(
    IPC_CHANNELS.PLATFORM_OPEN,
    async (_, platform: PlatformType, contentType?: SyncContentType) => {
      const manager = getBrowserViewManager()
      if (!manager) throw new Error('BrowserViewManager not initialized')
      await manager.openPlatformView(platform, contentType)
    }
  )

  ipcMain.handle(IPC_CHANNELS.PLATFORM_SWITCH, async (_, platform: PlatformType) => {
    const manager = getBrowserViewManager()
    if (!manager) throw new Error('BrowserViewManager not initialized')
    manager.switchToPlatformView(platform)
  })

  ipcMain.handle(IPC_CHANNELS.PLATFORM_CLOSE, async (_, platform: PlatformType) => {
    const manager = getBrowserViewManager()
    if (!manager) throw new Error('BrowserViewManager not initialized')
    await manager.closePlatformView(platform)
  })

  ipcMain.handle(IPC_CHANNELS.PLATFORM_HIDE, async (_, platform: PlatformType) => {
    const manager = getBrowserViewManager()
    if (!manager) throw new Error('BrowserViewManager not initialized')
    await manager.hidePlatformView(platform)
  })

  ipcMain.handle(IPC_CHANNELS.PLATFORM_HIDE_ALL, async () => {
    const manager = getBrowserViewManager()
    if (!manager) throw new Error('BrowserViewManager not initialized')
    manager.hideAllPlatformViews()
  })

  ipcMain.handle(IPC_CHANNELS.PLATFORM_CLOSE_ALL, async () => {
    const manager = getBrowserViewManager()
    if (!manager) throw new Error('BrowserViewManager not initialized')
    await manager.closeAllPlatformViews()
  })

  ipcMain.handle(IPC_CHANNELS.PLATFORM_LIST, async () => {
    const manager = getBrowserViewManager()
    if (!manager) throw new Error('BrowserViewManager not initialized')
    return manager.getOpenPlatforms()
  })

  ipcMain.handle(IPC_CHANNELS.PLATFORM_BACK, async (_, platform: PlatformType) => {
    const manager = getBrowserViewManager()
    if (!manager) throw new Error('BrowserViewManager not initialized')
    await manager.platformGoBack(platform)
  })

  ipcMain.handle(IPC_CHANNELS.PLATFORM_FORWARD, async (_, platform: PlatformType) => {
    const manager = getBrowserViewManager()
    if (!manager) throw new Error('BrowserViewManager not initialized')
    await manager.platformGoForward(platform)
  })

  ipcMain.handle(IPC_CHANNELS.PLATFORM_REFRESH, async (_, platform: PlatformType) => {
    const manager = getBrowserViewManager()
    if (!manager) throw new Error('BrowserViewManager not initialized')
    await manager.platformRefresh(platform)
  })

  // Executor handlers - now keyed by accountId for multi-account support
  ipcMain.handle(
    IPC_CHANNELS.EXECUTOR_OPEN,
    async (_, accountId: string, contentType?: SyncContentType) => {
      const manager = getBrowserViewManager()
      if (!manager) throw new Error('BrowserViewManager not initialized')

      // Get account info including platform and session partition
      const account = db.getAccount(accountId)
      if (!account) throw new Error(`Account not found: ${accountId}`)

      await manager.openExecutorView(
        accountId,
        account.platform,
        contentType,
        account.sessionPartition
      )
    }
  )

  // Open executor with default persistent session (for platforms without saved accounts)
  // Uses session partition: persist:${platform}-default
  // executorId format: default-${platform}
  ipcMain.handle(
    IPC_CHANNELS.EXECUTOR_OPEN_DEFAULT,
    async (_, platform: PlatformType, contentType?: SyncContentType) => {
      const manager = getBrowserViewManager()
      if (!manager) throw new Error('BrowserViewManager not initialized')

      const executorId = `default-${platform}`
      const sessionPartition = `persist:${platform}-default`

      await manager.openExecutorView(executorId, platform, contentType, sessionPartition)
    }
  )

  ipcMain.handle(IPC_CHANNELS.EXECUTOR_SHOW, async (_, accountId: string) => {
    const manager = getBrowserViewManager()
    if (!manager) throw new Error('BrowserViewManager not initialized')
    await manager.showExecutorView(accountId)
  })

  ipcMain.handle(IPC_CHANNELS.EXECUTOR_HIDE, async (_, accountId: string) => {
    const manager = getBrowserViewManager()
    if (!manager) throw new Error('BrowserViewManager not initialized')
    await manager.hideExecutorView(accountId)
  })

  ipcMain.handle(IPC_CHANNELS.EXECUTOR_HIDE_ALL, async () => {
    const manager = getBrowserViewManager()
    if (!manager) throw new Error('BrowserViewManager not initialized')
    manager.hideAllExecutorViews()
  })

  ipcMain.handle(IPC_CHANNELS.EXECUTOR_CLOSE, async (_, accountId: string) => {
    const manager = getBrowserViewManager()
    if (!manager) throw new Error('BrowserViewManager not initialized')
    await manager.closeExecutorView(accountId)
  })

  // Returns list of open executors with accountId and platform info
  ipcMain.handle(IPC_CHANNELS.EXECUTOR_LIST, async () => {
    const manager = getBrowserViewManager()
    if (!manager) throw new Error('BrowserViewManager not initialized')
    return manager.getOpenExecutors()
  })

  // App handlers
  ipcMain.handle(IPC_CHANNELS.APP_GET_VERSION, async () => {
    return app.getVersion()
  })

  ipcMain.handle(IPC_CHANNELS.APP_GET_PLATFORMS, async () => {
    return Object.values(PLATFORMS)
  })

  // Read file as data URL (for displaying local images in WebView)
  ipcMain.handle(IPC_CHANNELS.APP_READ_FILE_AS_DATA_URL, async (_, filePath: string) => {
    try {
      const buffer = fs.readFileSync(filePath)
      const mimeType = getMimeType(filePath)
      return `data:${mimeType};base64,${buffer.toString('base64')}`
    } catch (error) {
      console.error('Failed to read file as data URL:', filePath, error)
      throw error
    }
  })

  // Get file info (returns FileData with local-file:// URL)
  ipcMain.handle(IPC_CHANNELS.APP_GET_FILE_INFO, async (_, filePath: string) => {
    try {
      const stats = await fs.promises.stat(filePath)
      const mimeType = getMimeType(filePath)
      const name = path.basename(filePath)

      return {
        name,
        path: filePath,
        url: createLocalFileUrl(filePath),
        type: mimeType,
        size: stats.size
      }
    } catch (error) {
      console.error('Failed to get file info:', filePath, error)
      throw error
    }
  })

  // Select file dialog
  ipcMain.handle(
    IPC_CHANNELS.APP_SELECT_FILE,
    async (
      _,
      options?: {
        filters?: { name: string; extensions: string[] }[]
        multiple?: boolean
      }
    ) => {
      const result = await dialog.showOpenDialog({
        properties: options?.multiple ? ['openFile', 'multiSelections'] : ['openFile'],
        filters: options?.filters
      })

      if (result.canceled) {
        return []
      }

      return result.filePaths
    }
  )

  // Layout handlers
  ipcMain.handle(IPC_CHANNELS.LAYOUT_SET_SIDEBAR_WIDTH, async (_, width: number) => {
    const manager = getBrowserViewManager()
    if (manager) {
      manager.setSidebarWidth(width)
    }
  })

  // ========== Draft Handlers ==========

  ipcMain.handle(IPC_CHANNELS.DRAFT_LIST, async (_, contentType?: SyncContentType) => {
    return db.listDrafts(contentType)
  })

  ipcMain.handle(IPC_CHANNELS.DRAFT_GET, async (_, id: string) => {
    return db.getDraft(id)
  })

  ipcMain.handle(
    IPC_CHANNELS.DRAFT_CREATE,
    async (_, data: Omit<Draft, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = Date.now()
      const draft: Draft = {
        ...data,
        id: uuidv4(),
        createdAt: now,
        updatedAt: now
      }
      return db.createDraft(draft)
    }
  )

  ipcMain.handle(IPC_CHANNELS.DRAFT_UPDATE, async (_, id: string, data: Partial<Draft>) => {
    return db.updateDraft(id, data)
  })

  ipcMain.handle(IPC_CHANNELS.DRAFT_DELETE, async (_, id: string) => {
    db.deleteDraft(id)
  })

  // ========== Publish History Handlers ==========

  ipcMain.handle(
    IPC_CHANNELS.HISTORY_LIST,
    async (
      _,
      filters?: {
        platform?: PlatformType
        status?: PublishHistoryStatus
        limit?: number
        offset?: number
      }
    ) => {
      return db.listPublishHistory(filters)
    }
  )

  ipcMain.handle(IPC_CHANNELS.HISTORY_GET, async (_, id: string) => {
    return db.getPublishHistory(id)
  })

  ipcMain.handle(
    IPC_CHANNELS.HISTORY_CREATE,
    async (_, data: Omit<PublishHistory, 'id' | 'createdAt'>) => {
      const now = Date.now()
      const history: PublishHistory = {
        ...data,
        id: uuidv4(),
        createdAt: now
      }
      return db.createPublishHistory(history)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.HISTORY_UPDATE,
    async (_, id: string, data: Partial<PublishHistory>) => {
      return db.updatePublishHistory(id, data)
    }
  )

  ipcMain.handle(IPC_CHANNELS.HISTORY_DELETE, async (_, id: string) => {
    db.deletePublishHistory(id)
  })

  // ========== Scheduled Publish Handlers ==========

  ipcMain.handle(
    IPC_CHANNELS.SCHEDULED_LIST,
    async (_, filters?: { status?: string; beforeTime?: number }) => {
      return db.listScheduledPublish(
        filters as { status?: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' }
      )
    }
  )

  ipcMain.handle(IPC_CHANNELS.SCHEDULED_GET, async (_, id: string) => {
    return db.getScheduledPublish(id)
  })

  ipcMain.handle(
    IPC_CHANNELS.SCHEDULED_CREATE,
    async (_, data: Omit<ScheduledPublish, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = Date.now()
      const scheduled: ScheduledPublish = {
        ...data,
        id: uuidv4(),
        createdAt: now,
        updatedAt: now
      }
      return db.createScheduledPublish(scheduled)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.SCHEDULED_UPDATE,
    async (_, id: string, data: Partial<ScheduledPublish>) => {
      return db.updateScheduledPublish(id, data)
    }
  )

  ipcMain.handle(IPC_CHANNELS.SCHEDULED_DELETE, async (_, id: string) => {
    db.deleteScheduledPublish(id)
  })

  ipcMain.handle(IPC_CHANNELS.SCHEDULED_CANCEL, async (_, id: string) => {
    return db.updateScheduledPublish(id, { status: 'cancelled' })
  })

  // ========== WebView Bridge Handlers ==========
  // These handlers are called from the main site via window.multipost API

  // Publish start (single account)
  ipcMain.handle(
    'multipost:publish:start',
    async (
      _,
      params: {
        contentType: SyncContentType
        accountId: string
        data: SyncContentData
        autoSubmit?: boolean
      }
    ) => {
      const manager = getBrowserViewManager()
      if (!manager) {
        return publishError('BrowserViewManager not initialized', {
          taskId: '',
          status: 'failed',
          targets: [],
          updatedAt: Date.now()
        } satisfies PublishStatusSnapshot)
      }

      const { contentType, accountId, data, autoSubmit } = params
      const account = db.getAccount(accountId)
      if (!account) {
        return publishError(`Account not found: ${accountId}`, {
          taskId: '',
          status: 'failed',
          targets: [],
          updatedAt: Date.now()
        } satisfies PublishStatusSnapshot)
      }

      const taskId = manager.beginExecutorPublishRun({
        contentType,
        targets: [{ accountId, platform: account.platform }]
      })

      try {
        // Open executor for this account
        await manager.openExecutorView(
          accountId,
          account.platform,
          contentType,
          account.sessionPartition
        )
        if (manager.isPublishCancelled(taskId)) {
          await manager.closeExecutorView(accountId)
          const snapshot = manager.finishExecutorPublishRun(taskId)
          return publishError('Publish cancelled', snapshot, snapshot.targets, 2)
        }

        // Wait for page to load
        await new Promise((resolve) => setTimeout(resolve, 2000))
        if (manager.isPublishCancelled(taskId)) {
          await manager.closeExecutorView(accountId)
          const snapshot = manager.finishExecutorPublishRun(taskId)
          return publishError('Publish cancelled', snapshot, snapshot.targets, 2)
        }

        // Fill content
        const fillResult = await manager.fillExecutorContent(
          accountId,
          contentType,
          data,
          autoSubmit === true,
          taskId
        )

        // Auto submit if enabled
        if (autoSubmit && !fillResult.skipAdapterSubmit) {
          await new Promise((resolve) => setTimeout(resolve, 1000))
          if (manager.isPublishCancelled(taskId)) {
            await manager.closeExecutorView(accountId)
            const snapshot = manager.finishExecutorPublishRun(taskId)
            return publishError('Publish cancelled', snapshot, snapshot.targets, 2)
          }
          await manager.submitExecutorContent(accountId, contentType, taskId)
        }

        const snapshot = manager.finishExecutorPublishRun(taskId)
        if (snapshotHasFailure(snapshot)) {
          return publishError('Publish failed', snapshot, snapshot.targets)
        }
        if (snapshotWasCancelled(snapshot)) {
          return publishError('Publish cancelled', snapshot, snapshot.targets, 2)
        }
        return publishSuccess(
          snapshot.status === 'completed' ? 'Publish completed' : 'Publish prepared',
          snapshot,
          snapshot.targets
        )
      } catch (error) {
        const snapshot = manager.finishExecutorPublishRun(taskId)
        return publishError(
          snapshotWasCancelled(snapshot) ? 'Publish cancelled' : error,
          snapshot,
          snapshot.targets,
          snapshotWasCancelled(snapshot) ? 2 : 1
        )
      }
    }
  )

  // Publish start in executor (multiple targets)
  ipcMain.handle(
    'multipost:publish:startInExecutor',
    async (
      _,
      params: {
        contentType: SyncContentType
        targets: Array<{ accountId: string; platform: PlatformType; displayName?: string }>
        data: SyncContentData
        autoSubmit?: boolean
      }
    ) => {
      const manager = getBrowserViewManager()
      if (!manager) {
        return publishError('BrowserViewManager not initialized', {
          taskId: '',
          status: 'failed',
          targets: [],
          updatedAt: Date.now()
        } satisfies PublishStatusSnapshot)
      }

      const { contentType, targets, data, autoSubmit } = params
      const taskId = manager.beginExecutorPublishRun({ contentType, targets })

      for (const target of targets) {
        if (manager.isPublishCancelled(taskId)) {
          break
        }

        try {
          const account = db.getAccount(target.accountId)
          if (account) {
            await manager.openExecutorView(
              target.accountId,
              target.platform,
              contentType,
              account.sessionPartition
            )
          } else {
            // For default sessions (platforms without saved accounts)
            await manager.openExecutorView(
              target.accountId,
              target.platform,
              contentType,
              `persist:${target.platform}-default`
            )
          }
          if (manager.isPublishCancelled(taskId)) {
            await manager.closeExecutorView(target.accountId)
            break
          }

          // Wait for page to load
          await new Promise((resolve) => setTimeout(resolve, 2000))
          if (manager.isPublishCancelled(taskId)) {
            await manager.closeExecutorView(target.accountId)
            break
          }

          // Fill content
          const fillResult = await manager.fillExecutorContent(
            target.accountId,
            contentType,
            data,
            autoSubmit === true,
            taskId
          )

          // Auto submit if enabled
          if (autoSubmit && !fillResult.skipAdapterSubmit) {
            await new Promise((resolve) => setTimeout(resolve, 1000))
            if (manager.isPublishCancelled(taskId)) {
              await manager.closeExecutorView(target.accountId)
              break
            }
            await manager.submitExecutorContent(target.accountId, contentType, taskId)
          }
        } catch (error) {
          manager.markExecutorPublishTargetFailed(taskId, target.accountId, error)
          if (manager.isPublishCancelled(taskId)) {
            break
          }
        }
      }

      const snapshot = manager.finishExecutorPublishRun(taskId)
      if (snapshotHasFailure(snapshot)) {
        return publishError('One or more targets failed', snapshot, snapshot.targets)
      }
      if (snapshotWasCancelled(snapshot)) {
        return publishError('Publish cancelled', snapshot, snapshot.targets, 2)
      }
      return publishSuccess(
        snapshot.status === 'completed' ? 'Publish completed' : 'Publish prepared',
        snapshot,
        snapshot.targets
      )
    }
  )

  ipcMain.handle('multipost:publish:getStatus', async (_, taskId: string) => {
    const manager = getBrowserViewManager()
    if (!manager) {
      return 'idle'
    }
    return manager.getWebPublishStatus(taskId)
  })

  ipcMain.handle('multipost:publish:cancel', async (_, taskId: string) => {
    const manager = getBrowserViewManager()
    if (!manager) {
      return publishError('BrowserViewManager not initialized', {
        taskId,
        status: 'idle',
        targets: [],
        updatedAt: Date.now()
      } satisfies PublishStatusSnapshot)
    }
    const snapshot = await manager.cancelPublish(taskId)
    if (snapshot.status === 'idle') {
      return publishError(`Publish task not found: ${taskId}`, snapshot)
    }
    return publishSuccess('Publish cancelled', snapshot, snapshot.targets)
  })

  // Get login status with user info
  ipcMain.handle('multipost:browser:getLoginStatusWithInfo', async (_, accountId: string) => {
    const manager = getBrowserViewManager()
    if (!manager) throw new Error('BrowserViewManager not initialized')

    const account = db.getAccount(accountId)
    if (!account) throw new Error(`Account not found: ${accountId}`)

    const isLoggedIn = await manager.getLoginStatus(accountId, account.platform)
    return {
      isLoggedIn,
      userInfo: isLoggedIn
        ? {
            username: account.displayName || account.username,
            avatar: account.avatar
          }
        : undefined
    }
  })

  // ========== Browser Tab Handlers ==========

  ipcMain.handle(IPC_CHANNELS.BROWSER_TAB_LIST, async () => {
    const manager = getBrowserViewManager()
    if (!manager) throw new Error('BrowserViewManager not initialized')
    return manager.getTabs()
  })

  ipcMain.handle(IPC_CHANNELS.BROWSER_TAB_SWITCH, async (_, accountId: string) => {
    const manager = getBrowserViewManager()
    if (!manager) throw new Error('BrowserViewManager not initialized')
    await manager.switchTab(accountId)
  })

  ipcMain.handle(IPC_CHANNELS.BROWSER_TAB_SWITCH_HOME, async () => {
    const manager = getBrowserViewManager()
    if (!manager) throw new Error('BrowserViewManager not initialized')
    await manager.switchToHome()
  })

  ipcMain.handle(IPC_CHANNELS.BROWSER_TAB_CLOSE, async (_, accountId: string) => {
    const manager = getBrowserViewManager()
    if (!manager) throw new Error('BrowserViewManager not initialized')
    return manager.closeTab(accountId)
  })

  ipcMain.handle(IPC_CHANNELS.BROWSER_TAB_GO_BACK, async (_, accountId: string) => {
    const manager = getBrowserViewManager()
    if (!manager) throw new Error('BrowserViewManager not initialized')
    await manager.tabGoBack(accountId)
  })

  ipcMain.handle(IPC_CHANNELS.BROWSER_TAB_GO_FORWARD, async (_, accountId: string) => {
    const manager = getBrowserViewManager()
    if (!manager) throw new Error('BrowserViewManager not initialized')
    await manager.tabGoForward(accountId)
  })

  ipcMain.handle(IPC_CHANNELS.BROWSER_TAB_REFRESH, async (_, accountId: string) => {
    const manager = getBrowserViewManager()
    if (!manager) throw new Error('BrowserViewManager not initialized')
    await manager.tabRefresh(accountId)
  })

  // ========== Publish Group Handlers ==========

  ipcMain.handle(
    IPC_CHANNELS.PUBLISH_GROUP_CREATE,
    async (
      _,
      params: {
        contentType: SyncContentType
        targets: Array<{ accountId: string; platform: PlatformType; displayName: string }>
        data: SyncContentData
        autoPublish?: boolean
      }
    ) => {
      const manager = getBrowserViewManager()
      if (!manager) throw new Error('BrowserViewManager not initialized')
      return manager.createPublishGroup(params)
    }
  )

  ipcMain.handle(IPC_CHANNELS.PUBLISH_GROUP_SHOW, async (_, groupId: string) => {
    const manager = getBrowserViewManager()
    if (!manager) throw new Error('BrowserViewManager not initialized')
    await manager.showPublishGroup(groupId)
  })

  ipcMain.handle(
    IPC_CHANNELS.PUBLISH_GROUP_SWITCH_TAB,
    async (_, groupId: string, accountId: string) => {
      const manager = getBrowserViewManager()
      if (!manager) throw new Error('BrowserViewManager not initialized')
      await manager.switchGroupTab(groupId, accountId)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.PUBLISH_GROUP_CLOSE_TAB,
    async (_, groupId: string, accountId: string) => {
      const manager = getBrowserViewManager()
      if (!manager) throw new Error('BrowserViewManager not initialized')
      await manager.closeGroupTab(groupId, accountId)
    }
  )

  ipcMain.handle(IPC_CHANNELS.PUBLISH_GROUP_CLOSE, async (_, groupId: string) => {
    const manager = getBrowserViewManager()
    if (!manager) throw new Error('BrowserViewManager not initialized')
    await manager.closePublishGroup(groupId)
  })

  ipcMain.handle(IPC_CHANNELS.PUBLISH_GROUP_GET_TABS, async (_, groupId: string) => {
    const manager = getBrowserViewManager()
    if (!manager) throw new Error('BrowserViewManager not initialized')
    return manager.getGroupTabs(groupId)
  })

  ipcMain.handle(IPC_CHANNELS.PUBLISH_GROUP_GET, async (_, groupId: string) => {
    const manager = getBrowserViewManager()
    if (!manager) throw new Error('BrowserViewManager not initialized')
    return manager.getPublishGroup(groupId)
  })

  ipcMain.handle(IPC_CHANNELS.PUBLISH_GROUP_LIST, async () => {
    const manager = getBrowserViewManager()
    if (!manager) throw new Error('BrowserViewManager not initialized')
    return manager.getPublishGroups()
  })

  ipcMain.handle(IPC_CHANNELS.PUBLISH_GROUP_FILL, async (_, groupId: string) => {
    const manager = getBrowserViewManager()
    if (!manager) throw new Error('BrowserViewManager not initialized')
    await manager.fillGroupContent(groupId)
  })

  ipcMain.handle(
    IPC_CHANNELS.PUBLISH_GROUP_SUBMIT_ONE,
    async (_, groupId: string, accountId: string) => {
      const manager = getBrowserViewManager()
      if (!manager) throw new Error('BrowserViewManager not initialized')
      await manager.submitGroupTarget(groupId, accountId)
    }
  )

  ipcMain.handle(IPC_CHANNELS.PUBLISH_GROUP_SUBMIT_ALL, async (_, groupId: string) => {
    const manager = getBrowserViewManager()
    if (!manager) throw new Error('BrowserViewManager not initialized')
    await manager.submitGroupAll(groupId)
  })

  ipcMain.handle(
    IPC_CHANNELS.PUBLISH_GROUP_UPDATE_STATUS,
    async (_, groupId: string, accountId: string, status: PublishTargetStatus) => {
      const manager = getBrowserViewManager()
      if (!manager) throw new Error('BrowserViewManager not initialized')
      manager.updateGroupTargetStatus(groupId, accountId, status)
    }
  )

  // ========== WebView Bridge: Publish Group ==========

  ipcMain.handle(
    'multipost:publishGroup:create',
    async (
      _,
      params: {
        contentType: SyncContentType
        targets: Array<{ accountId: string; platform: PlatformType; displayName: string }>
        data: SyncContentData
        autoPublish?: boolean
      }
    ) => {
      const manager = getBrowserViewManager()
      if (!manager) throw new Error('BrowserViewManager not initialized')
      return manager.createPublishGroup(params)
    }
  )

  ipcMain.handle('multipost:publishGroup:show', async (_, groupId: string) => {
    const manager = getBrowserViewManager()
    if (!manager) throw new Error('BrowserViewManager not initialized')
    await manager.showPublishGroup(groupId)
  })

  ipcMain.handle(
    'multipost:publishGroup:switchTab',
    async (_, groupId: string, accountId: string) => {
      const manager = getBrowserViewManager()
      if (!manager) throw new Error('BrowserViewManager not initialized')
      await manager.switchGroupTab(groupId, accountId)
    }
  )

  ipcMain.handle('multipost:publishGroup:close', async (_, groupId: string) => {
    const manager = getBrowserViewManager()
    if (!manager) throw new Error('BrowserViewManager not initialized')
    await manager.closePublishGroup(groupId)
  })

  ipcMain.handle('multipost:publishGroup:getTabs', async (_, groupId: string) => {
    const manager = getBrowserViewManager()
    if (!manager) throw new Error('BrowserViewManager not initialized')
    return manager.getGroupTabs(groupId)
  })

  ipcMain.handle('multipost:publishGroup:get', async (_, groupId: string) => {
    const manager = getBrowserViewManager()
    if (!manager) throw new Error('BrowserViewManager not initialized')
    return manager.getPublishGroup(groupId)
  })

  ipcMain.handle('multipost:publishGroup:fill', async (_, groupId: string) => {
    const manager = getBrowserViewManager()
    if (!manager) throw new Error('BrowserViewManager not initialized')
    await manager.fillGroupContent(groupId)
  })

  ipcMain.handle('multipost:publishGroup:submitAll', async (_, groupId: string) => {
    const manager = getBrowserViewManager()
    if (!manager) throw new Error('BrowserViewManager not initialized')
    await manager.submitGroupAll(groupId)
  })

  ipcMain.handle('multipost:publishGroup:getActiveGroupId', async () => {
    const manager = getBrowserViewManager()
    if (!manager) throw new Error('BrowserViewManager not initialized')
    return manager.getActiveGroupId()
  })

  // ========== KeepAlive Handlers ==========

  ipcMain.handle(IPC_CHANNELS.KEEPALIVE_GET_STATUS, async () => {
    return keepAliveService.getStatus()
  })

  ipcMain.handle(IPC_CHANNELS.KEEPALIVE_TRIGGER, async () => {
    return keepAliveService.triggerOnce()
  })
}
