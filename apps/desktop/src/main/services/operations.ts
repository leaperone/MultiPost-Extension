/**
 * Operations facade for the external API surface (REST + MCP).
 *
 * Wraps BrowserViewManager + DatabaseService behind plain async functions so
 * the HTTP layer never reaches into Electron internals directly. The IPC
 * handlers keep their own (behavior-identical) paths; this module only serves
 * external callers and therefore also takes care of media normalization —
 * external requests reference media as local paths or http(s) URLs, while the
 * fill scripts require allowlisted local-file:// FileData.
 */
import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import { v4 as uuidv4 } from 'uuid'
import { marked } from 'marked'
import { PLATFORMS } from '../../shared/constants'
import {
  createFileDataFromPath,
  toPublicAccount,
  type Account,
  type ArticleData,
  type DynamicData,
  type FileData,
  type PlatformInfo,
  type PlatformType,
  type PodcastData,
  type PublishGroup,
  type PublishHistory,
  type PublishHistoryStatus,
  type PublishStatusSnapshot,
  type SyncContentData,
  type SyncContentType,
  type VideoData
} from '../../shared/types'
import type { BrowserViewManager } from '../browser/browserViewManager'
import { DatabaseService } from '../database'
import { allowLocalFile } from '../browser/sessionHardening'
import { getMimeType } from '../utils/mime'

export class OperationError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

type ManagerGetter = () => BrowserViewManager | null
type WindowGetter = () => Electron.BrowserWindow | null

let getManager: ManagerGetter = () => null
let getWindow: WindowGetter = () => null

export function initOperations(managerGetter: ManagerGetter, windowGetter: WindowGetter): void {
  getManager = managerGetter
  getWindow = windowGetter
}

function requireManager(): BrowserViewManager {
  const manager = getManager()
  if (!manager) {
    throw new OperationError(503, 'not_ready', 'BrowserViewManager not initialized yet')
  }
  return manager
}

function db(): DatabaseService {
  return DatabaseService.getInstance()
}

// ========== Accounts ==========

export function listAccounts(filters?: {
  platform?: PlatformType
  groupId?: string
}): Account[] {
  return db().listAccounts(filters).map(toPublicAccount)
}

export function getAccount(id: string): Account {
  const account = db().getAccount(id)
  if (!account) {
    throw new OperationError(404, 'account_not_found', `Account not found: ${id}`)
  }
  return toPublicAccount(account)
}

export async function refreshAccount(id: string): Promise<Account> {
  const manager = requireManager()
  if (!db().getAccount(id)) {
    throw new OperationError(404, 'account_not_found', `Account not found: ${id}`)
  }
  const updated = await manager.refreshAccountInfo(id)
  if (!updated) {
    throw new OperationError(500, 'refresh_failed', `Failed to refresh account: ${id}`)
  }
  return toPublicAccount(updated)
}

// ========== Platforms ==========

export function listPlatforms(): PlatformInfo[] {
  return Object.values(PLATFORMS)
}

// ========== Media normalization ==========

export type MediaInput = string | { path?: string; url?: string; name?: string }

const DOWNLOAD_TIMEOUT_MS = 5 * 60 * 1000

function mediaDir(): string {
  const dir = path.join(app.getPath('userData'), 'api-media')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

function extensionForDownload(url: URL, contentType: string | null): string {
  const fromPath = path.extname(url.pathname)
  if (fromPath && fromPath.length <= 8) return fromPath
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'video/mp4': '.mp4',
    'video/quicktime': '.mov',
    'audio/mpeg': '.mp3',
    'audio/mp4': '.m4a',
    'audio/wav': '.wav'
  }
  const normalized = contentType?.split(';')[0].trim().toLowerCase() || ''
  return map[normalized] || '.bin'
}

async function downloadToLocalFile(rawUrl: string, name?: string): Promise<FileData> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new OperationError(400, 'invalid_media', `Invalid media URL: ${rawUrl}`)
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new OperationError(400, 'invalid_media', `Unsupported media URL protocol: ${url.protocol}`)
  }

  const response = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) })
  if (!response.ok || !response.body) {
    throw new OperationError(
      400,
      'media_download_failed',
      `Failed to download media (${response.status}): ${rawUrl}`
    )
  }

  const ext = extensionForDownload(url, response.headers.get('content-type'))
  const filePath = path.join(mediaDir(), `api-${Date.now()}-${uuidv4().slice(0, 8)}${ext}`)
  await pipeline(Readable.fromWeb(response.body as never), fs.createWriteStream(filePath))

  const stats = await fs.promises.stat(filePath)
  allowLocalFile(filePath)
  return createFileDataFromPath(
    filePath,
    name || path.basename(url.pathname) || path.basename(filePath),
    getMimeType(filePath),
    stats.size
  )
}

function localPathToFileData(filePath: string, name?: string): FileData {
  if (!path.isAbsolute(filePath)) {
    throw new OperationError(400, 'invalid_media', `Media path must be absolute: ${filePath}`)
  }
  let stats: fs.Stats
  try {
    stats = fs.statSync(filePath)
  } catch {
    throw new OperationError(400, 'media_not_found', `Media file not found: ${filePath}`)
  }
  if (!stats.isFile()) {
    throw new OperationError(400, 'invalid_media', `Media path is not a file: ${filePath}`)
  }
  allowLocalFile(filePath)
  return createFileDataFromPath(
    filePath,
    name || path.basename(filePath),
    getMimeType(filePath),
    stats.size
  )
}

export async function resolveMedia(input: MediaInput): Promise<FileData> {
  if (typeof input === 'string') {
    if (/^https?:\/\//i.test(input)) {
      return downloadToLocalFile(input)
    }
    return localPathToFileData(input)
  }
  if (input.path) {
    return localPathToFileData(input.path, input.name)
  }
  if (input.url) {
    return downloadToLocalFile(input.url, input.name)
  }
  throw new OperationError(400, 'invalid_media', 'Media entry must include "path" or "url"')
}

async function resolveMediaList(inputs: MediaInput[] | undefined): Promise<FileData[]> {
  if (!inputs?.length) return []
  return Promise.all(inputs.map((input) => resolveMedia(input)))
}

// ========== Publish ==========

export interface CreatePublishParams {
  contentType: SyncContentType
  accountIds: string[]
  data: Record<string, unknown>
  autoSubmit: boolean
}

interface PublishTarget {
  accountId: string
  platform: PlatformType
  displayName: string
}

function resolveTargets(accountIds: string[], contentType: SyncContentType): PublishTarget[] {
  const targets: PublishTarget[] = []
  for (const accountId of accountIds) {
    const account = db().getAccount(accountId)
    if (!account) {
      throw new OperationError(404, 'account_not_found', `Account not found: ${accountId}`)
    }
    const platformInfo = PLATFORMS[account.platform]
    if (platformInfo && !platformInfo.supportedContentTypes.includes(contentType)) {
      throw new OperationError(
        400,
        'unsupported_content_type',
        `Platform ${account.platform} (account ${accountId}) does not support ${contentType}`
      )
    }
    targets.push({
      accountId,
      platform: account.platform,
      displayName: account.remark || account.displayName || account.username
    })
  }
  return targets
}

async function buildContentData(
  contentType: SyncContentType,
  data: Record<string, unknown>
): Promise<SyncContentData> {
  switch (contentType) {
    case 'DYNAMIC': {
      const dynamic: DynamicData = {
        title: (data.title as string) || '',
        content: (data.content as string) || '',
        images: await resolveMediaList(data.images as MediaInput[] | undefined),
        videos: await resolveMediaList(data.videos as MediaInput[] | undefined),
        tags: data.tags as string[] | undefined
      }
      return dynamic
    }
    case 'VIDEO': {
      const video: VideoData = {
        title: (data.title as string) || '',
        content: (data.content as string) || '',
        video: await resolveMedia(data.video as MediaInput),
        cover: data.cover ? await resolveMedia(data.cover as MediaInput) : undefined,
        tags: data.tags as string[] | undefined
      }
      return video
    }
    case 'ARTICLE': {
      const markdownContent = (data.markdownContent as string) || ''
      const htmlContent =
        (data.htmlContent as string) || (markdownContent ? await marked(markdownContent) : '')
      const article: ArticleData = {
        title: (data.title as string) || '',
        digest: (data.digest as string) || '',
        // ArticleData declares cover as required, but every consumer guards on
        // it; external callers may legitimately publish text-only articles.
        cover: (data.cover ? await resolveMedia(data.cover as MediaInput) : undefined) as FileData,
        htmlContent,
        markdownContent,
        images: await resolveMediaList(data.images as MediaInput[] | undefined),
        tags: data.tags as string[] | undefined
      }
      return article
    }
    case 'PODCAST': {
      const podcast: PodcastData = {
        title: (data.title as string) || '',
        description: (data.description as string) || (data.content as string) || '',
        audio: await resolveMedia(data.audio as MediaInput),
        cover: data.cover ? await resolveMedia(data.cover as MediaInput) : undefined,
        tags: data.tags as string[] | undefined
      }
      return podcast
    }
  }
}

export interface CreatePublishResult {
  groupId: string
  status: PublishStatusSnapshot
}

/**
 * Creates a publish group (one BrowserView per account) and triggers content
 * fill. With autoSubmit the group also submits every ready target; otherwise
 * the caller reviews via getPublishStatus and confirms with submitPublish.
 */
export async function createPublish(params: CreatePublishParams): Promise<CreatePublishResult> {
  const manager = requireManager()
  const targets = resolveTargets(params.accountIds, params.contentType)
  const data = await buildContentData(params.contentType, params.data)

  const groupId = await manager.createPublishGroup({
    contentType: params.contentType,
    targets,
    data,
    autoPublish: params.autoSubmit
  })

  return { groupId, status: manager.getPublishStatus(groupId) }
}

export interface PublishStatusResult extends PublishStatusSnapshot {
  /** false once the group window has been closed (snapshot is final). */
  open: boolean
}

export function getPublishStatus(groupId: string): PublishStatusResult {
  const manager = requireManager()
  const snapshot = manager.getPublishStatus(groupId)
  if (snapshot.status === 'idle' && snapshot.targets.length === 0) {
    throw new OperationError(
      404,
      'publish_not_found',
      `Publish task not found (or its status expired): ${groupId}`
    )
  }
  return { ...snapshot, open: Boolean(manager.getPublishGroup(groupId)) }
}

export function listPublishGroups(): PublishGroup[] {
  return requireManager().getPublishGroups()
}

function requireGroup(groupId: string): void {
  if (!requireManager().getPublishGroup(groupId)) {
    throw new OperationError(404, 'publish_not_found', `Publish group not open: ${groupId}`)
  }
}

export async function submitPublish(groupId: string): Promise<PublishStatusResult> {
  const manager = requireManager()
  requireGroup(groupId)
  await manager.submitGroupAll(groupId)
  return getPublishStatus(groupId)
}

export async function submitPublishTarget(
  groupId: string,
  accountId: string
): Promise<PublishStatusResult> {
  const manager = requireManager()
  requireGroup(groupId)
  await manager.submitGroupTarget(groupId, accountId)
  return getPublishStatus(groupId)
}

export async function retryPublishTarget(
  groupId: string,
  accountId: string
): Promise<PublishStatusResult> {
  const manager = requireManager()
  requireGroup(groupId)
  await manager.retryGroupTarget(groupId, accountId)
  return getPublishStatus(groupId)
}

export async function closePublish(groupId: string): Promise<void> {
  const manager = requireManager()
  requireGroup(groupId)
  await manager.closePublishGroup(groupId)
}

// ========== History ==========

export function listHistory(filters?: {
  platform?: PlatformType
  status?: PublishHistoryStatus
  limit?: number
  offset?: number
}): PublishHistory[] {
  return db().listPublishHistory(filters)
}

export function getHistory(id: string): PublishHistory {
  const history = db().getPublishHistory(id)
  if (!history) {
    throw new OperationError(404, 'history_not_found', `Publish history not found: ${id}`)
  }
  return history
}

// ========== Debug / observability ==========
// Same capability set as the dev-only debug server, but token-gated and
// production-available so external agents can diagnose publish runs.

export function getDebugViews(): Record<string, unknown> {
  return requireManager().getDebugInfo()
}

export function getDebugGroupData(groupId: string): Record<string, unknown> {
  const data = requireManager().debugGetGroupData(groupId)
  if (!data) {
    throw new OperationError(404, 'publish_not_found', `Publish group not open: ${groupId}`)
  }
  return data
}

export function executeScript(viewId: string, script: string): Promise<unknown> {
  return requireManager().debugExecScript(viewId, script)
}

export function executeGroupScript(
  groupId: string,
  accountId: string,
  script: string
): Promise<unknown> {
  return requireManager().debugExecGroupScript(groupId, accountId, script)
}

export function getConsoleLogs(filter?: {
  source?: string
  level?: string
  since?: number
  limit?: number
}): unknown[] {
  return requireManager().debugGetLogs(filter)
}

export function clearConsoleLogs(): void {
  requireManager().debugClearLogs()
}

/** Tail of the rotating electron-log main-process log file. */
export function getAppLogs(limit = 200): { file: string; lines: string[] } {
  const file = path.join(app.getPath('userData'), 'logs', 'main.log')
  const cappedLimit = Math.min(Math.max(limit, 1), 2000)
  try {
    const content = fs.readFileSync(file, 'utf-8')
    const lines = content.split(/\r?\n/).filter(Boolean)
    return { file, lines: lines.slice(-cappedLimit) }
  } catch {
    return { file, lines: [] }
  }
}

export async function captureScreenshot(options?: {
  groupId?: string
  accountId?: string
}): Promise<Buffer> {
  if (options?.groupId && options?.accountId) {
    const manager = requireManager()
    const image = await manager.debugCaptureGroupView(options.groupId, options.accountId)
    return image.toPNG()
  }
  const window = getWindow()
  if (!window || window.isDestroyed()) {
    throw new OperationError(503, 'not_ready', 'Main window not available')
  }
  const image = await window.capturePage()
  return image.toPNG()
}

export function toggleDevTools(groupId: string, accountId: string): void {
  requireManager().debugToggleDevTools(groupId, accountId)
}

export async function getGroupCookies(
  groupId: string,
  accountId: string,
  domain?: string
): Promise<Array<{ name: string; domain: string; valuePreview: string }>> {
  const cookies = await requireManager().debugGetCookies(groupId, accountId, domain)
  // Session cookies are credentials — only a truncated preview ever leaves
  // the process, enough to confirm presence without enabling replay.
  return cookies.map((cookie) => ({
    name: cookie.name,
    domain: cookie.domain ?? '',
    valuePreview: `${cookie.value.slice(0, 8)}…`
  }))
}
