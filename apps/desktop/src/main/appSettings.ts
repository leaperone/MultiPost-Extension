import { app } from 'electron'
import { randomBytes } from 'crypto'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { ExternalApiSettings, KeepAliveConfig, ProxySettings } from '../shared/types'

/**
 * Main-process settings that must be readable outside the renderer (e.g. at
 * window-close time). Persisted as plain JSON in userData; renderer-only
 * preferences keep living in localStorage.
 */
export type CloseWindowBehavior = 'minimize' | 'quit'

interface AppSettings {
  closeWindowBehavior?: CloseWindowBehavior
  keepAlive?: Partial<KeepAliveConfig>
  externalApi?: Partial<ExternalApiSettings>
  defaultProxyId?: string | null
  globalProxyId?: string | null
  debugLog?: boolean
  telemetry?: { enabled?: boolean }
  injectorHotUpdate?: { enabled?: boolean }
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

/** Debug logging defaults to off: verbose file logs are opt-in for diagnosing issues. */
export function getDebugLogEnabled(): boolean {
  return readSettings().debugLog === true
}

export function setDebugLogEnabled(enabled: boolean): void {
  const settings = readSettings()
  settings.debugLog = enabled
  writeSettings(settings)
}

/**
 * Telemetry (Sentry error/crash reporting) defaults to ON — it is opt-out, the
 * one signal that lets us fix crashes users never report. Only an explicit
 * `false` disables it, so a missing/blank settings file reports by default.
 */
export function getTelemetryEnabled(): boolean {
  return readSettings().telemetry?.enabled !== false
}

export function setTelemetryEnabled(enabled: boolean): void {
  const settings = readSettings()
  settings.telemetry = { ...settings.telemetry, enabled }
  writeSettings(settings)
}

/**
 * Injector hot-update defaults to OFF: it is a gated rollout and an escape hatch.
 * While off, desktop only ever uses its built-in injector bundles — the remote
 * layer is never fetched, so a bad deploy or a flaky network cannot touch publishing.
 */
export function getInjectorHotUpdateEnabled(): boolean {
  return readSettings().injectorHotUpdate?.enabled === true
}

export function setInjectorHotUpdateEnabled(enabled: boolean): void {
  const settings = readSettings()
  settings.injectorHotUpdate = { ...settings.injectorHotUpdate, enabled }
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

function normalizeProxySettingId(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

export function getProxySettings(): ProxySettings {
  const settings = readSettings()
  return {
    defaultProxyId: normalizeProxySettingId(settings.defaultProxyId),
    globalProxyId: normalizeProxySettingId(settings.globalProxyId)
  }
}

export function setProxySettings(patch: Partial<ProxySettings>): ProxySettings {
  const settings = readSettings()
  const current = getProxySettings()

  settings.defaultProxyId =
    Object.prototype.hasOwnProperty.call(patch, 'defaultProxyId')
      ? normalizeProxySettingId(patch.defaultProxyId)
      : current.defaultProxyId
  settings.globalProxyId =
    Object.prototype.hasOwnProperty.call(patch, 'globalProxyId')
      ? normalizeProxySettingId(patch.globalProxyId)
      : current.globalProxyId

  writeSettings(settings)
  return getProxySettings()
}

export function getDefaultProxyId(): string | null {
  return getProxySettings().defaultProxyId
}

export function getGlobalProxyId(): string | null {
  return getProxySettings().globalProxyId
}

export const EXTERNAL_API_DEFAULT_PORT = 19528

function generateExternalApiToken(): string {
  return `mp-${randomBytes(24).toString('base64url')}`
}

/**
 * External API defaults to OFF — exposing a publish-capable HTTP surface is
 * strictly opt-in. The token is minted lazily on first read so the settings
 * page can show it before the server has ever been enabled.
 */
export function getExternalApiSettings(): ExternalApiSettings {
  const settings = readSettings()
  const raw = settings.externalApi
  const port =
    typeof raw?.port === 'number' && Number.isInteger(raw.port) && raw.port >= 1024 && raw.port <= 65535
      ? raw.port
      : EXTERNAL_API_DEFAULT_PORT
  let token = typeof raw?.token === 'string' && raw.token.length >= 16 ? raw.token : ''
  if (!token) {
    token = generateExternalApiToken()
    settings.externalApi = { ...raw, token }
    writeSettings(settings)
  }
  return { enabled: raw?.enabled === true, port, token }
}

export function setExternalApiSettings(
  config: Partial<Omit<ExternalApiSettings, 'token'>>
): ExternalApiSettings {
  const settings = readSettings()
  settings.externalApi = { ...getExternalApiSettings(), ...config }
  writeSettings(settings)
  return getExternalApiSettings()
}

/** Invalidate the old token immediately; callers must re-read settings. */
export function regenerateExternalApiToken(): ExternalApiSettings {
  const settings = readSettings()
  settings.externalApi = { ...getExternalApiSettings(), token: generateExternalApiToken() }
  writeSettings(settings)
  return getExternalApiSettings()
}
