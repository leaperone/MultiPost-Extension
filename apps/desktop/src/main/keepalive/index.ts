import { WebContentsView, session } from 'electron'
import { PLATFORMS } from '../../shared/constants'
import type {
  Account,
  PlatformType,
  KeepAliveAccountResult,
  KeepAliveConfig,
  KeepAliveStatus
} from '../../shared/types'
import { DatabaseService } from '../database'
import { getKeepAliveConfig, setKeepAliveConfig } from '../appSettings'
import { isSupportedBrowserNavigationUrl, openExternalUrl } from '../browser/externalUrl'
import { hardenSession } from '../browser/sessionHardening'
import { keepaliveLogger } from '../logger'
import {
  applyAccountProxy,
  releaseAccountProxyForWebContents,
  trackAccountProxyForWebContents
} from '../proxy/accountProxy'

interface KeepAliveOptions {
  getLoginStatus: (accountId: string, platform: PlatformType) => Promise<boolean>
  /** Fires when a round flips an account from logged-in to logged-out */
  onAccountLoggedOut?: (account: Account) => void
  /** Fires at round start/end and on config changes, for live UI updates */
  onStatusChanged?: (status: KeepAliveStatus) => void
}

const STARTUP_DELAY_MIN_MS = 30 * 1000
const STARTUP_DELAY_MAX_MS = 90 * 1000
const PAGE_WAIT_MS = 15 * 1000 // wait for JS/cookie refresh
const PAGE_TIMEOUT_MS = 30 * 1000 // total timeout per account
const ACCOUNT_GAP_MIN_MS = 3 * 1000
const ACCOUNT_GAP_MAX_MS = 10 * 1000
// Runs are jittered ±25% around the configured interval so platform-side
// traffic analysis never sees a metronome-precise visitor.
const INTERVAL_JITTER_RATIO = 0.25

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

type NavigationGuardableWebContents = Electron.WebContents & {
  on(
    event: 'will-frame-navigate',
    listener: (event: Electron.Event, url: string) => void
  ): Electron.WebContents
}

function installKeepAliveNavigationGuard(view: WebContentsView, source: string): void {
  const webContents = view.webContents
  const guardNavigation = (event: Electron.Event, url: string): void => {
    if (isSupportedBrowserNavigationUrl(url)) {
      return
    }

    event.preventDefault()
    keepaliveLogger.warn(`Blocked unsupported navigation from ${source}:`, url)
    void openExternalUrl(url)
  }

  webContents.on('will-navigate', guardNavigation)
  ;(webContents as NavigationGuardableWebContents).on('will-frame-navigate', guardNavigation)
  webContents.on('will-redirect', guardNavigation)
  webContents.setWindowOpenHandler(({ url }) => {
    keepaliveLogger.warn(`Blocked window open from ${source}:`, url)
    void openExternalUrl(url)
    return { action: 'deny' }
  })
}

export class KeepAliveService {
  private timer: NodeJS.Timeout | null = null
  private isRunning = false
  private lastRunAt: number | null = null
  private nextRunAt: number | null = null
  private lastResults: KeepAliveAccountResult[] = []
  private getLoginStatus: ((accountId: string, platform: PlatformType) => Promise<boolean>) | null =
    null
  private onAccountLoggedOut: ((account: Account) => void) | null = null
  private onStatusChanged: ((status: KeepAliveStatus) => void) | null = null

  start(options: KeepAliveOptions): void {
    this.stop()
    this.getLoginStatus = options.getLoginStatus
    this.onAccountLoggedOut = options.onAccountLoggedOut ?? null
    this.onStatusChanged = options.onStatusChanged ?? null

    const config = getKeepAliveConfig()
    if (!config.enabled) {
      keepaliveLogger.info('Disabled by user setting, not scheduling')
      return
    }

    const delayMs = randomBetween(STARTUP_DELAY_MIN_MS, STARTUP_DELAY_MAX_MS)
    this.scheduleNext(delayMs)
    keepaliveLogger.info(
      `Started. First run in ${Math.round(delayMs / 1000)}s, then every ~${config.intervalHours}h (jittered)`
    )
  }

  stop(): void {
    this.clearTimer()
    keepaliveLogger.info('Stopped')
  }

  /** Persist a config change and reschedule accordingly; returns the new status. */
  applyConfig(config: Partial<KeepAliveConfig>): KeepAliveStatus {
    const wasScheduled = this.timer !== null
    const applied = setKeepAliveConfig(config)

    if (!applied.enabled) {
      this.clearTimer()
      keepaliveLogger.info('Disabled by user')
    } else if (!wasScheduled) {
      // Just switched on: run soon so the user sees it take effect
      this.scheduleNext(randomBetween(STARTUP_DELAY_MIN_MS, STARTUP_DELAY_MAX_MS))
      keepaliveLogger.info('Enabled by user')
    } else {
      this.scheduleNext(this.jitteredIntervalMs(applied.intervalHours))
      keepaliveLogger.info(`Interval changed to ~${applied.intervalHours}h`)
    }

    const status = this.getStatus()
    this.onStatusChanged?.(status)
    return status
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.nextRunAt = null
  }

  private jitteredIntervalMs(intervalHours: number): number {
    const baseMs = intervalHours * 60 * 60 * 1000
    return randomBetween(baseMs * (1 - INTERVAL_JITTER_RATIO), baseMs * (1 + INTERVAL_JITTER_RATIO))
  }

  private scheduleNext(delayMs: number): void {
    this.clearTimer()
    this.nextRunAt = Date.now() + delayMs
    this.timer = setTimeout(() => {
      void this.triggerOnce().finally(() => {
        // Re-read config: it may have changed while the round was running
        const config = getKeepAliveConfig()
        if (config.enabled) {
          this.scheduleNext(this.jitteredIntervalMs(config.intervalHours))
        }
      })
    }, delayMs)
  }

  async triggerOnce(): Promise<KeepAliveStatus> {
    if (this.isRunning) {
      keepaliveLogger.info('Already running, skipping')
      return this.getStatus()
    }

    this.isRunning = true
    this.onStatusChanged?.(this.getStatus())
    keepaliveLogger.info('Starting keep-alive round...')

    try {
      const db = DatabaseService.getInstance()
      const allAccounts: Account[] = db.listAccounts()
      const loggedInAccounts = allAccounts.filter((a) => a.isLoggedIn)

      if (loggedInAccounts.length === 0) {
        keepaliveLogger.info('No logged-in accounts, skipping')
        this.lastRunAt = Date.now()
        this.lastResults = []
        return this.getStatus()
      }

      keepaliveLogger.info(`Processing ${loggedInAccounts.length} logged-in accounts...`)
      const results: KeepAliveAccountResult[] = []

      for (const account of loggedInAccounts) {
        const result = await this.processAccount(account)
        results.push(result)

        // Randomized gap between accounts, same anti-fingerprinting idea as the
        // jittered round interval
        if (loggedInAccounts.indexOf(account) < loggedInAccounts.length - 1) {
          await this.sleep(randomBetween(ACCOUNT_GAP_MIN_MS, ACCOUNT_GAP_MAX_MS))
        }
      }

      this.lastRunAt = Date.now()
      this.lastResults = results

      const successCount = results.filter((r) => r.success).length
      const failCount = results.filter((r) => !r.success).length
      const logoutCount = results.filter((r) => r.success && !r.stillLoggedIn).length
      const unknownCount = results.filter((r) => r.checkFailed).length
      keepaliveLogger.info(
        `Round complete: ${successCount} success, ${failCount} failed, ${logoutCount} logged out, ${unknownCount} unknown`
      )

      return this.getStatus()
    } finally {
      this.isRunning = false
      this.onStatusChanged?.(this.getStatus())
    }
  }

  getStatus(): KeepAliveStatus {
    const config = getKeepAliveConfig()
    return {
      isRunning: this.isRunning,
      enabled: config.enabled,
      intervalHours: config.intervalHours,
      lastRunAt: this.lastRunAt,
      nextRunAt: this.timer ? this.nextRunAt : null,
      lastResults: this.lastResults
    }
  }

  private async processAccount(account: Account): Promise<KeepAliveAccountResult> {
    const platformInfo = PLATFORMS[account.platform]
    const displayName = account.displayName || account.username || account.platform

    if (!platformInfo) {
      keepaliveLogger.info(`Unknown platform: ${account.platform}, skipping`)
      return {
        accountId: account.id,
        platform: account.platform,
        displayName,
        success: false,
        stillLoggedIn: false,
        error: 'Unknown platform'
      }
    }

    const url = platformInfo.url
    keepaliveLogger.info(`Processing ${account.platform} (${displayName}): ${url}`)

    let view: WebContentsView | null = null
    try {
      const partition = account.sessionPartition || `persist:account-${account.id}`
      const ses = session.fromPartition(partition)
      hardenSession(ses)
      await applyAccountProxy(ses, account)

      view = new WebContentsView({
        webPreferences: {
          session: ses,
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true
        }
      })
      trackAccountProxyForWebContents(view.webContents)
      installKeepAliveNavigationGuard(view, `${account.platform}:${account.id}`)

      // Load platform URL with timeout
      await Promise.race([
        view.webContents.loadURL(url),
        this.sleep(PAGE_TIMEOUT_MS).then(() => {
          throw new Error('Page load timeout')
        })
      ])

      // Wait for JS/cookie refresh
      await this.sleep(PAGE_WAIT_MS)

      // Check login status. A failed check means "unknown", not "logged out":
      // we leave the DB alone but surface checkFailed so the UI can say so.
      let stillLoggedIn = true
      let checkFailed = false
      if (this.getLoginStatus) {
        try {
          stillLoggedIn = await this.getLoginStatus(account.id, account.platform)
        } catch {
          checkFailed = true
          stillLoggedIn = true
        }
      }

      // Update DB if status changed
      if (!checkFailed && !stillLoggedIn && account.isLoggedIn) {
        const db = DatabaseService.getInstance()
        const updated = db.updateAccount(account.id, { isLoggedIn: false })
        keepaliveLogger.info(`${account.platform} (${displayName}): session expired`)
        this.onAccountLoggedOut?.(updated ?? { ...account, isLoggedIn: false })
      }

      keepaliveLogger.info(
        `${account.platform} (${displayName}): OK, loggedIn=${stillLoggedIn}${checkFailed ? ' (check failed)' : ''}`
      )

      return {
        accountId: account.id,
        platform: account.platform,
        displayName,
        success: true,
        stillLoggedIn,
        ...(checkFailed ? { checkFailed } : {})
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      keepaliveLogger.info(`${account.platform} (${displayName}): error - ${errorMsg}`)

      return {
        accountId: account.id,
        platform: account.platform,
        displayName,
        success: false,
        stillLoggedIn: false,
        error: errorMsg
      }
    } finally {
      // Destroy the hidden view
      if (view) {
        try {
          await releaseAccountProxyForWebContents(view.webContents)
          ;(view.webContents as Electron.WebContents).close()
        } catch {
          // View may already be destroyed
        }
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
