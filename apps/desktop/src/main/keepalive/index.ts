import { BrowserView, session } from 'electron'
import { PLATFORMS } from '../../shared/constants'
import type { Account, PlatformType, KeepAliveAccountResult, KeepAliveStatus } from '../../shared/types'
import { DatabaseService } from '../database'
import { hardenSession } from '../browser/sessionHardening'
import {
  applyAccountProxy,
  releaseAccountProxyForWebContents,
  trackAccountProxyForWebContents
} from '../proxy/accountProxy'

interface KeepAliveOptions {
  intervalMs?: number
  delayMs?: number
  getLoginStatus: (accountId: string, platform: PlatformType) => Promise<boolean>
}

const DEFAULT_INTERVAL_MS = 4 * 60 * 60 * 1000 // 4 hours
const DEFAULT_DELAY_MS = 30 * 1000 // 30 seconds after startup
const PAGE_WAIT_MS = 15 * 1000 // wait for JS/cookie refresh
const PAGE_TIMEOUT_MS = 30 * 1000 // total timeout per account
const ACCOUNT_GAP_MS = 5 * 1000 // gap between accounts

export class KeepAliveService {
  private timer: NodeJS.Timeout | null = null
  private isRunning = false
  private lastRunAt: number | null = null
  private lastResults: KeepAliveAccountResult[] = []
  private getLoginStatus: ((accountId: string, platform: PlatformType) => Promise<boolean>) | null =
    null

  start(options: KeepAliveOptions): void {
    this.stop()
    this.getLoginStatus = options.getLoginStatus

    const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS
    const delayMs = options.delayMs ?? DEFAULT_DELAY_MS

    // First run after delay
    setTimeout(() => {
      this.triggerOnce()
      // Then repeat at interval
      this.timer = setInterval(() => {
        this.triggerOnce()
      }, intervalMs)
    }, delayMs)

    console.log(
      `[KeepAlive] Started. First run in ${delayMs / 1000}s, then every ${intervalMs / 1000 / 60 / 60}h`
    )
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    console.log('[KeepAlive] Stopped')
  }

  async triggerOnce(): Promise<KeepAliveStatus> {
    if (this.isRunning) {
      console.log('[KeepAlive] Already running, skipping')
      return this.getStatus()
    }

    this.isRunning = true
    console.log('[KeepAlive] Starting keep-alive round...')

    try {
      const db = DatabaseService.getInstance()
      const allAccounts: Account[] = db.listAccounts()
      const loggedInAccounts = allAccounts.filter((a) => a.isLoggedIn)

      if (loggedInAccounts.length === 0) {
        console.log('[KeepAlive] No logged-in accounts, skipping')
        this.lastRunAt = Date.now()
        this.lastResults = []
        return this.getStatus()
      }

      console.log(`[KeepAlive] Processing ${loggedInAccounts.length} logged-in accounts...`)
      const results: KeepAliveAccountResult[] = []

      for (const account of loggedInAccounts) {
        const result = await this.processAccount(account)
        results.push(result)

        // Gap between accounts
        if (loggedInAccounts.indexOf(account) < loggedInAccounts.length - 1) {
          await this.sleep(ACCOUNT_GAP_MS)
        }
      }

      this.lastRunAt = Date.now()
      this.lastResults = results

      const successCount = results.filter((r) => r.success).length
      const failCount = results.filter((r) => !r.success).length
      const logoutCount = results.filter((r) => r.success && !r.stillLoggedIn).length
      console.log(
        `[KeepAlive] Round complete: ${successCount} success, ${failCount} failed, ${logoutCount} logged out`
      )

      return this.getStatus()
    } finally {
      this.isRunning = false
    }
  }

  getStatus(): KeepAliveStatus {
    return {
      isRunning: this.isRunning,
      lastRunAt: this.lastRunAt,
      lastResults: this.lastResults
    }
  }

  private async processAccount(account: Account): Promise<KeepAliveAccountResult> {
    const platformInfo = PLATFORMS[account.platform]
    const displayName = account.displayName || account.username || account.platform

    if (!platformInfo) {
      console.log(`[KeepAlive] Unknown platform: ${account.platform}, skipping`)
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
    console.log(`[KeepAlive] Processing ${account.platform} (${displayName}): ${url}`)

    let view: BrowserView | null = null
    try {
      const partition = account.sessionPartition || `persist:account-${account.id}`
      const ses = session.fromPartition(partition)
      hardenSession(ses)
      await applyAccountProxy(ses, account)

      view = new BrowserView({
        webPreferences: {
          session: ses,
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true
        }
      })
      trackAccountProxyForWebContents(view.webContents)

      // Load platform URL with timeout
      await Promise.race([
        view.webContents.loadURL(url),
        this.sleep(PAGE_TIMEOUT_MS).then(() => {
          throw new Error('Page load timeout')
        })
      ])

      // Wait for JS/cookie refresh
      await this.sleep(PAGE_WAIT_MS)

      // Check login status
      let stillLoggedIn = true
      if (this.getLoginStatus) {
        try {
          stillLoggedIn = await this.getLoginStatus(account.id, account.platform)
        } catch {
          // If login check fails, assume still logged in (don't update DB unnecessarily)
          stillLoggedIn = true
        }
      }

      // Update DB if status changed
      if (!stillLoggedIn && account.isLoggedIn) {
        const db = DatabaseService.getInstance()
        db.updateAccount(account.id, { isLoggedIn: false })
        console.log(`[KeepAlive] ${account.platform} (${displayName}): session expired`)
      }

      console.log(
        `[KeepAlive] ${account.platform} (${displayName}): OK, loggedIn=${stillLoggedIn}`
      )

      return {
        accountId: account.id,
        platform: account.platform,
        displayName,
        success: true,
        stillLoggedIn
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.log(`[KeepAlive] ${account.platform} (${displayName}): error - ${errorMsg}`)

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
