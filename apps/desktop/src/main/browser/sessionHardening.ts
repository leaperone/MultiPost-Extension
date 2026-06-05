import { app, session, type Session } from 'electron'
import * as fs from 'fs'
import { basename } from 'path'
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

export interface UserAgentDataProfile {
  brands: UserAgentBrand[]
  mobile: boolean
  platform: string
  architecture: string
  bitness: string
  fullVersionList: UserAgentBrand[]
  model: string
  platformVersion: string
  uaFullVersion: string
  wow64: boolean
}

export interface HardenSessionOptions {
  includeDesktopHeader?: boolean
}

const SESSION_LANGUAGE_CODES = ['zh-CN', 'zh', 'en-US', 'en']
const SESSION_ACCEPT_LANGUAGES = SESSION_LANGUAGE_CODES.join(',')
const ACCEPT_LANGUAGE_HEADER = 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7'
const hardenedSessions = new WeakSet<Session>()
const localFileProtocolSessions = new WeakSet<Session>()
const sessionStates = new WeakMap<Session, { includeDesktopHeader: boolean }>()
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
  const userAgentData = getDesktopUserAgentData(userAgent)

  return {
    'sec-ch-ua': formatBrandsHeader(userAgentData.brands),
    'sec-ch-ua-mobile': userAgentData.mobile ? '?1' : '?0',
    'sec-ch-ua-platform': `"${userAgentData.platform}"`
  }
}

export function getDesktopUserAgentData(userAgent = getDesktopUserAgent()): UserAgentDataProfile {
  const chromeVersion = getChromeVersion(userAgent)
  const chromeMajor = chromeVersion.split('.')[0] || '120'
  const platform = getClientHintsPlatform(userAgent)
  const greaseBrand = { brand: 'Not A(Brand', version: '24' }
  const chromiumBrand = { brand: 'Chromium', version: chromeMajor }
  const chromeBrand = { brand: 'Google Chrome', version: chromeMajor }
  const fullVersionList = [
    { ...greaseBrand, version: '24.0.0.0' },
    { ...chromiumBrand, version: chromeVersion },
    { ...chromeBrand, version: chromeVersion }
  ]

  return {
    brands: [greaseBrand, chromiumBrand, chromeBrand],
    mobile: false,
    platform,
    architecture: getArchitecture(),
    bitness: process.arch.includes('64') ? '64' : '32',
    fullVersionList,
    model: '',
    platformVersion: getPlatformVersion(platform),
    uaFullVersion: chromeVersion,
    wow64: false
  }
}

export function getDesktopNavigatorPlatform(userAgent = getDesktopUserAgent()): 'MacIntel' | 'Win32' | 'Linux x86_64' {
  if (userAgent.includes('Windows NT')) {
    return 'Win32'
  }
  if (userAgent.includes('Macintosh')) {
    return 'MacIntel'
  }
  return 'Linux x86_64'
}

export function getDesktopLanguage(): string {
  return SESSION_LANGUAGE_CODES[0]
}

export function getDesktopLanguages(): string[] {
  return [...SESSION_LANGUAGE_CODES]
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
  const existingState = sessionStates.get(ses)
  if (existingState) {
    existingState.includeDesktopHeader = existingState.includeDesktopHeader || !!opts.includeDesktopHeader
  } else {
    sessionStates.set(ses, { includeDesktopHeader: !!opts.includeDesktopHeader })
  }

  if (hardenedSessions.has(ses)) {
    return
  }
  hardenedSessions.add(ses)

  const userAgent = getDesktopUserAgent()
  ses.setUserAgent(userAgent, SESSION_ACCEPT_LANGUAGES)

  ses.webRequest.onBeforeSendHeaders({ urls: ['*://*/*'] }, (details, callback) => {
    const requestHeaders = { ...details.requestHeaders }
    const clientHints = getDesktopUserAgentClientHints(userAgent)
    const state = sessionStates.get(ses)

    setHeader(requestHeaders, 'User-Agent', userAgent)
    setHeader(requestHeaders, 'Accept-Language', ACCEPT_LANGUAGE_HEADER)
    setHeader(requestHeaders, 'sec-ch-ua', clientHints['sec-ch-ua'])
    setHeader(requestHeaders, 'sec-ch-ua-mobile', clientHints['sec-ch-ua-mobile'])
    setHeader(requestHeaders, 'sec-ch-ua-platform', clientHints['sec-ch-ua-platform'])

    if (state?.includeDesktopHeader && isWebAppUrl(details.url)) {
      setHeader(requestHeaders, 'X-MultiPost-Desktop', '1')
    }

    callback({ requestHeaders })
  })
}

export async function handleLocalFileRequest(request: Request): Promise<Response> {
  const filePath = getLocalFilePath(request.url)

  if (!fs.existsSync(filePath)) {
    return new Response('File not found', { status: 404 })
  }
  if (filePath.includes('..')) {
    return new Response('Invalid path', { status: 403 })
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

// TODO Phase 1: replace path-shaped local-file URLs with a per-session capability allowlist.
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

function getArchitecture(): string {
  if (process.arch === 'arm64' || process.arch.startsWith('arm')) {
    return 'arm'
  }
  return 'x86'
}

function getPlatformVersion(platform: string): string {
  if (platform === 'Windows') {
    return '10.0.0'
  }
  if (platform === 'macOS') {
    return '10.15.7'
  }
  return ''
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
  const filePath = decodeURIComponent('/' + url.host + url.pathname)
  if (process.platform === 'win32' && /^\/[A-Za-z]:\//.test(filePath)) {
    return filePath.slice(1)
  }
  return filePath
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
