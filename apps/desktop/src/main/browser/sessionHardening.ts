import { app, session, type Session } from 'electron'
import * as fs from 'fs'
import { basename, extname, resolve } from 'path'
import { is } from '@electron-toolkit/utils'
import { getMimeType } from '../utils/mime'

export interface UserAgentBrand {
  brand: string
  version: string
}

export interface UserAgentClientHintsHeaderProfile {
  'sec-ch-ua': string
  'sec-ch-ua-mobile': string
  'sec-ch-ua-platform': string
}

export interface HardenSessionOptions {
  includeDesktopHeader?: boolean
}

interface HardenedSessionState {
  includeDesktopHeader: boolean
}

const SESSION_LANGUAGE_CODES = ['zh-CN', 'zh', 'en-US', 'en']
const SESSION_ACCEPT_LANGUAGES = SESSION_LANGUAGE_CODES.join(',')
const ACCEPT_LANGUAGE_HEADER = 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7'
const hardenedSessions = new WeakSet<Session>()
const localFileProtocolSessions = new WeakSet<Session>()
const sessionStates = new WeakMap<Session, HardenedSessionState>()
let cachedDesktopUserAgent: string | null = null

export function getDesktopUserAgent(): string {
  if (cachedDesktopUserAgent) {
    return cachedDesktopUserAgent
  }

  const defaultUserAgent = getDefaultElectronUserAgent()
  cachedDesktopUserAgent = stripElectronTokens(defaultUserAgent)
  return cachedDesktopUserAgent
}

export function getDesktopUserAgentClientHints(
  userAgent = getDesktopUserAgent()
): UserAgentClientHintsHeaderProfile {
  const chromeMajor = getChromeVersion(userAgent).split('.')[0] || '120'
  const brands: UserAgentBrand[] = [
    { brand: 'Not A(Brand', version: '24' },
    { brand: 'Chromium', version: chromeMajor },
    { brand: 'Google Chrome', version: chromeMajor }
  ]

  return {
    'sec-ch-ua': formatBrandsHeader(brands),
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': `"${getClientHintsPlatform(userAgent)}"`
  }
}

export function getDesktopRequestHeaders(
  extraHeaders: Record<string, string> = {},
  userAgent = getDesktopUserAgent()
): Record<string, string> {
  return {
    'User-Agent': userAgent,
    'Accept-Language': ACCEPT_LANGUAGE_HEADER,
    ...getDesktopUserAgentClientHints(userAgent),
    ...extraHeaders
  }
}

export function hardenSession(ses: Session, opts: HardenSessionOptions = {}): void {
  const nextState = getNextSessionState(ses, opts)
  sessionStates.set(ses, nextState)
  ses.setUserAgent(getDesktopUserAgent(), SESSION_ACCEPT_LANGUAGES)

  if (hardenedSessions.has(ses)) {
    return
  }
  hardenedSessions.add(ses)

  ses.webRequest.onBeforeSendHeaders({ urls: ['*://*/*'] }, (details, callback) => {
    const requestHeaders = { ...details.requestHeaders }
    const state = sessionStates.get(ses) || getDefaultSessionState()
    const userAgent = getDesktopUserAgent()
    const clientHints = getDesktopUserAgentClientHints(userAgent)

    setHeader(requestHeaders, 'User-Agent', userAgent)
    setHeader(requestHeaders, 'Accept-Language', ACCEPT_LANGUAGE_HEADER)
    setHeader(requestHeaders, 'sec-ch-ua', clientHints['sec-ch-ua'])
    setHeader(requestHeaders, 'sec-ch-ua-mobile', clientHints['sec-ch-ua-mobile'])
    setHeader(requestHeaders, 'sec-ch-ua-platform', clientHints['sec-ch-ua-platform'])

    if (state.includeDesktopHeader && isWebAppUrl(details.url)) {
      setHeader(requestHeaders, 'X-MultiPost-Desktop', '1')
    }

    callback({ requestHeaders })
  })
}

// Per-session capability allowlist for local-file://. The protocol is
// registered on account sessions so fill scripts can fetch media, which means
// remote platform pages could otherwise read arbitrary files from disk. Only
// paths the app itself handed out (file picker, drag & drop, publish payloads)
// are servable.
const allowedLocalFiles = new Set<string>()

// Media extensions the app legitimately hands to platform views. Restricting
// the allowlist to these limits the blast radius if app UI is ever XSS'd.
const ALLOWED_LOCAL_FILE_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.heic', '.avif',
  '.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.m4v',
  '.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg'
])

function hasAllowedMediaExtension(filePath: string): boolean {
  return ALLOWED_LOCAL_FILE_EXTENSIONS.has(extname(filePath).toLowerCase())
}

// Canonical key for the allowlist: resolve symlinks so a later swap of a
// registered symlink/junction can't redirect to a sensitive file, and
// case-fold on Windows where paths are case-insensitive.
function canonicalLocalFileKey(filePath: string): string {
  let resolved = resolve(filePath)
  try {
    resolved = fs.realpathSync.native(resolved)
  } catch {
    // File may not exist yet at registration; fall back to the resolved path.
  }
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved
}

export function allowLocalFile(filePath: string): void {
  if (typeof filePath === 'string' && filePath.length > 0 && hasAllowedMediaExtension(filePath)) {
    allowedLocalFiles.add(canonicalLocalFileKey(filePath))
  }
}

export function allowLocalFileUrl(urlString: string): void {
  try {
    allowLocalFile(getLocalFilePath(urlString))
  } catch {
    // Malformed URL: nothing to allow.
  }
}

export async function handleLocalFileRequest(request: Request): Promise<Response> {
  const filePath = getLocalFilePath(request.url)

  if (filePath.includes('..')) {
    return new Response('Invalid path', { status: 403 })
  }
  if (!allowedLocalFiles.has(canonicalLocalFileKey(filePath))) {
    console.warn('[LocalFileProtocol] Blocked non-allowlisted file:', basename(filePath))
    return new Response('Forbidden', { status: 403 })
  }
  if (!fs.existsSync(filePath)) {
    return new Response('File not found', { status: 404 })
  }

  try {
    const buffer = await fs.promises.readFile(filePath)
    const mimeType = getMimeType(filePath)

    return new Response(buffer, {
      headers: { 'Content-Type': mimeType }
    })
  } catch (error) {
    console.error('[LocalFileProtocol] Failed to read file:', basename(filePath), error)
    return new Response('Failed to read file', { status: 500 })
  }
}

export function registerLocalFileProtocol(ses: Session): void {
  if (localFileProtocolSessions.has(ses)) {
    return
  }
  localFileProtocolSessions.add(ses)

  try {
    ses.protocol.handle('local-file', handleLocalFileRequest)
    console.log('[SessionHardening] Registered local-file:// protocol on session')
  } catch {
    // The default session or a previously hardened partition may already own the scheme.
  }
}

function getDefaultSessionState(): HardenedSessionState {
  return {
    includeDesktopHeader: false
  }
}

function getNextSessionState(ses: Session, opts: HardenSessionOptions): HardenedSessionState {
  const existingState = sessionStates.get(ses)
  const defaultState = existingState || getDefaultSessionState()

  return {
    includeDesktopHeader: defaultState.includeDesktopHeader || !!opts.includeDesktopHeader
  }
}

function getDefaultElectronUserAgent(): string {
  try {
    return session.defaultSession.getUserAgent()
  } catch {
    const chromeVersion = process.versions.chrome || '120.0.0.0'
    return `Mozilla/5.0 (${getHostUserAgentOsToken()}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36 Electron/${process.versions.electron || '0.0.0'} ${app.getName()}/${app.getVersion()}`
  }
}

function stripElectronTokens(userAgent: string): string {
  const appName = escapeRegExp(app.getName())
  return userAgent
    .replace(new RegExp(`\\s+(?:Electron|multipost-desktop|${appName})/[^\\s]+`, 'gi'), '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function getChromeVersion(userAgent: string): string {
  return userAgent.match(/Chrome\/([0-9.]+)/)?.[1] || process.versions.chrome || '120.0.0.0'
}

function formatBrandsHeader(brands: UserAgentBrand[]): string {
  return brands.map((brand) => `"${brand.brand}";v="${brand.version}"`).join(', ')
}

function setHeader(headers: Record<string, string>, headerName: string, value: string): void {
  const existingKey = Object.keys(headers).find((key) => key.toLowerCase() === headerName.toLowerCase())
  if (existingKey && existingKey !== headerName) {
    delete headers[existingKey]
  }
  headers[headerName] = value
}

function isWebAppUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url)
    if (is.dev) {
      const configuredOrigin = process.env.MULTIPOST_WEB_URL || 'http://localhost:3000'
      return parsedUrl.origin === configuredOrigin || parsedUrl.origin === 'http://localhost:3000'
    }
    return parsedUrl.protocol === 'https:' && parsedUrl.hostname === 'multipost.app'
  } catch {
    return false
  }
}

function getClientHintsPlatform(userAgent: string): string {
  if (userAgent.includes('Windows NT')) {
    return 'Windows'
  }
  if (userAgent.includes('Macintosh')) {
    return 'macOS'
  }
  return 'Linux'
}

function getHostUserAgentOsToken(): string {
  if (process.platform === 'win32') {
    return 'Windows NT 10.0; Win64; x64'
  }
  if (process.platform === 'darwin') {
    return 'Macintosh; Intel Mac OS X 10_15_7'
  }
  return 'X11; Linux x86_64'
}

function getLocalFilePath(urlString: string): string {
  const url = new URL(urlString)
  const filePath = decodeURIComponent(url.host ? `/${url.host}${url.pathname}` : url.pathname)
  if (process.platform === 'win32' && /^\/[A-Za-z]:\//.test(filePath)) {
    return filePath.slice(1)
  }
  return filePath
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
