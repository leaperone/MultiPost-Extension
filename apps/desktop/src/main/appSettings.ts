import { app } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { KeepAliveConfig } from '../shared/types'

/**
 * Main-process settings that must be readable outside the renderer (e.g. at
 * window-close time). Persisted as plain JSON in userData; renderer-only
 * preferences keep living in localStorage.
 */
export type CloseWindowBehavior = 'minimize' | 'quit'

interface AppSettings {
  closeWindowBehavior?: CloseWindowBehavior
  keepAlive?: Partial<KeepAliveConfig>
}

function settingsPath(): string {
  return join(app.getPath('userData'), 'app-settings.json')
}

function readSettings(): AppSettings {
  try {
    if (!existsSync(settingsPath())) return {}
    return JSON.parse(readFileSync(settingsPath(), 'utf-8')) as AppSettings
  } catch (error) {
    console.warn('[AppSettings] Failed to read settings:', error)
    return {}
  }
}

function writeSettings(settings: AppSettings): void {
  try {
    writeFileSync(settingsPath(), JSON.stringify(settings, null, 2))
  } catch (error) {
    console.warn('[AppSettings] Failed to write settings:', error)
  }
}

/** Default is "keep running": the product is meant to stay on a second screen all day. */
export function getCloseWindowBehavior(): CloseWindowBehavior {
  return readSettings().closeWindowBehavior === 'quit' ? 'quit' : 'minimize'
}

export function setCloseWindowBehavior(behavior: CloseWindowBehavior): void {
  const settings = readSettings()
  settings.closeWindowBehavior = behavior
  writeSettings(settings)
}

export const KEEPALIVE_DEFAULT_INTERVAL_HOURS = 4
export const KEEPALIVE_MIN_INTERVAL_HOURS = 1
export const KEEPALIVE_MAX_INTERVAL_HOURS = 24

/** Keep-alive defaults to on: unattended session refresh is the product's core promise. */
export function getKeepAliveConfig(): KeepAliveConfig {
  const raw = readSettings().keepAlive
  const intervalHours =
    typeof raw?.intervalHours === 'number' && Number.isFinite(raw.intervalHours)
      ? Math.min(
          Math.max(Math.round(raw.intervalHours), KEEPALIVE_MIN_INTERVAL_HOURS),
          KEEPALIVE_MAX_INTERVAL_HOURS
        )
      : KEEPALIVE_DEFAULT_INTERVAL_HOURS
  return { enabled: raw?.enabled !== false, intervalHours }
}

export function setKeepAliveConfig(config: Partial<KeepAliveConfig>): KeepAliveConfig {
  const settings = readSettings()
  settings.keepAlive = { ...getKeepAliveConfig(), ...config }
  writeSettings(settings)
  return getKeepAliveConfig()
}
