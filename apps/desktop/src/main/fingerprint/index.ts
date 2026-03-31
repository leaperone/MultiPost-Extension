/**
 * FingerprintService - manages browser fingerprint profiles
 * Generates unique fingerprints per account and injects them into BrowserViews
 */

import type { WebContents } from 'electron'
import type { FingerprintProfile } from '../../shared/types/fingerprint'
import { generateFingerprintProfile } from './generator'
import { generateInjectionScript } from './injector'
import { DatabaseService } from '../database'

export class FingerprintService {
  private static instance: FingerprintService
  private db: DatabaseService

  private constructor() {
    this.db = DatabaseService.getInstance()
  }

  static getInstance(): FingerprintService {
    if (!FingerprintService.instance) {
      FingerprintService.instance = new FingerprintService()
    }
    return FingerprintService.instance
  }

  /**
   * Get or create fingerprint profile for an account
   */
  async getOrCreateProfile(accountId: string): Promise<FingerprintProfile> {
    // Try to get existing profile
    const existing = this.db.getFingerprintProfile(accountId)
    if (existing) {
      return existing
    }

    // Generate new profile
    const profileData = generateFingerprintProfile(accountId)
    const id = `fp_${accountId}_${Date.now()}`
    const profile: FingerprintProfile = {
      id,
      ...profileData
    }

    // Save to database
    this.db.createFingerprintProfile(profile)

    return profile
  }

  /**
   * Apply fingerprint to a WebContents using CDP
   * Must be called before page loads
   */
  async applyFingerprintToWebContents(webContents: WebContents, accountId: string): Promise<void> {
    console.log('[FingerprintService] Getting profile for:', accountId)
    const profile = await this.getOrCreateProfile(accountId)
    console.log('[FingerprintService] Profile obtained')
    const script = generateInjectionScript(profile)
    console.log('[FingerprintService] Script generated, attaching debugger...')

    // Attach debugger to use CDP
    try {
      webContents.debugger.attach('1.3')
      console.log('[FingerprintService] Debugger attached')
    } catch (err) {
      // Debugger might already be attached
      if (!(err as Error).message?.includes('already attached')) {
        console.error('[FingerprintService] Failed to attach debugger:', err)
        return
      }
      console.log('[FingerprintService] Debugger already attached')
    }

    try {
      console.log('[FingerprintService] Enabling Page domain...')
      // Must enable Page domain first before using Page methods
      await webContents.debugger.sendCommand('Page.enable')
      console.log('[FingerprintService] Page domain enabled, sending script injection command...')

      // Inject script to run on every new document
      await webContents.debugger.sendCommand('Page.addScriptToEvaluateOnNewDocument', {
        source: script
      })
      console.log('[FingerprintService] CDP command sent successfully')
    } catch (err) {
      console.error('[FingerprintService] Failed to inject fingerprint script:', err)
    }

    // Detach debugger when webContents is destroyed
    webContents.once('destroyed', () => {
      try {
        if (webContents.debugger.isAttached()) {
          webContents.debugger.detach()
        }
      } catch {
        // Ignore errors during cleanup
      }
    })
  }

  /**
   * Delete fingerprint profile for an account
   */
  deleteProfile(accountId: string): void {
    this.db.deleteFingerprintProfile(accountId)
  }

  /**
   * Regenerate fingerprint profile for an account
   * Useful if user wants to reset their fingerprint
   */
  async regenerateProfile(accountId: string): Promise<FingerprintProfile> {
    // Delete existing
    this.db.deleteFingerprintProfile(accountId)

    // Create new
    return this.getOrCreateProfile(accountId)
  }

  /**
   * Get fingerprint profile without creating
   */
  getProfile(accountId: string): FingerprintProfile | null {
    return this.db.getFingerprintProfile(accountId)
  }
}
