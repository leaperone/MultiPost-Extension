import { app } from 'electron'
import { join } from 'path'
import log from 'electron-log/main'
import { getDebugLogEnabled } from './appSettings'

/**
 * Unified file logging, split per module so a user-supplied "logs folder" zip
 * is immediately navigable: publish failures live in publish.log, keep-alive
 * rounds in keepalive.log, instead of one interleaved main.log.
 *
 * Routing is scope-based: a single electron-log instance keeps the debug
 * toggle/level in one place, while resolvePathFn fans messages out to one
 * file per scope. electron-log tracks size/rotation per resolved path, so
 * each file rotates independently at maxSize.
 */
const SCOPE_LOG_FILES: Record<string, string> = {
  keepalive: 'keepalive.log',
  publish: 'publish.log',
  ipc: 'ipc.log',
  renderer: 'renderer.log'
}

export function getLogsDir(): string {
  return join(app.getPath('userData'), 'logs')
}

/**
 * Debug mode is a user-facing toggle (settings page), persisted in
 * app-settings.json. Off keeps files at info to bound disk noise; on lets
 * debug/verbose through for diagnosing issues in the field — applied live,
 * no restart needed.
 */
export function applyDebugLogSetting(enabled: boolean): void {
  log.transports.file.level = enabled ? 'silly' : 'info'
}

export function initLogging(): void {
  // preload:false is critical — electron-log otherwise injects a logging preload
  // (window.__electronLog) into every future session, including the untrusted
  // platform BrowserViews that are supposed to receive no app preload at all.
  // Renderer logs instead travel over our own preload bridge (log:fromRenderer).
  log.initialize({ preload: false, spyRendererConsole: false })
  log.transports.file.maxSize = 5 * 1024 * 1024
  log.transports.file.resolvePathFn = (_variables, message) => {
    const fileName = (message?.scope && SCOPE_LOG_FILES[message.scope]) || 'main.log'
    return join(getLogsDir(), fileName)
  }
  log.transports.file.writeOptions = { ...log.transports.file.writeOptions, mode: 0o600 }
  applyDebugLogSetting(getDebugLogEnabled())
  // Unscoped console.* in the main process keeps landing in main.log, so
  // modules that haven't adopted a scoped logger stay diagnosable.
  Object.assign(console, log.functions)
}

export const keepaliveLogger = log.scope('keepalive')
export const publishLogger = log.scope('publish')
export const ipcLogger = log.scope('ipc')
export const rendererLogger = log.scope('renderer')
