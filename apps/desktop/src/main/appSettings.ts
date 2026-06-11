import { app } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

/**
 * Main-process settings that must be readable outside the renderer (e.g. at
 * window-close time). Persisted as plain JSON in userData; renderer-only
 * preferences keep living in localStorage.
 */
export type CloseWindowBehavior = 'minimize' | 'quit'

interface AppSettings {
  closeWindowBehavior?: CloseWindowBehavior
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
