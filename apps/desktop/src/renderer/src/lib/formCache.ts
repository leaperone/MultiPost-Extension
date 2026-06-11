import type { SyncContentType } from '../../../shared/types'

/**
 * Auto-saved snapshot of a publish form, so accidentally closing the page (or
 * the app) never loses what the user typed. Cleared only by the explicit
 * "清空" action on each publish page. Media entries store filesystem paths —
 * the local-file:// allowlist does not survive restarts, so restore must
 * re-register (and re-validate) every path before building previews.
 */
export interface PublishFormCache {
  version: 1
  title?: string
  content?: string
  digest?: string
  tags?: string[]
  /** Image paths (dynamic page). */
  images?: string[]
  /** Video paths (dynamic page). */
  videos?: string[]
  /** Single main media path (video page video / podcast audio). */
  mainMedia?: string
  cover?: string
  horizontalCover?: string
  verticalCover?: string
  selectedAccountIds?: string[]
  selectedOtherPlatforms?: string[]
  currentDraftId?: string | null
  autoSubmit?: boolean
}

const CACHE_VERSION = 1

function cacheKey(contentType: SyncContentType): string {
  return `multipost.formCache.${contentType}`
}

export function loadFormCache(contentType: SyncContentType): PublishFormCache | null {
  try {
    const raw = localStorage.getItem(cacheKey(contentType))
    if (!raw) return null
    const parsed = JSON.parse(raw) as PublishFormCache
    if (parsed?.version !== CACHE_VERSION) return null
    return parsed
  } catch {
    return null
  }
}

export function saveFormCache(
  contentType: SyncContentType,
  data: Omit<PublishFormCache, 'version'>
): void {
  try {
    localStorage.setItem(cacheKey(contentType), JSON.stringify({ version: CACHE_VERSION, ...data }))
  } catch (error) {
    // Quota errors only degrade auto-save; never break the form itself.
    console.error('Failed to save form cache:', error)
  }
}

export function clearFormCache(contentType: SyncContentType): void {
  try {
    localStorage.removeItem(cacheKey(contentType))
  } catch {
    // ignore
  }
}

/**
 * Validate cached media paths: keep only files that still exist (getFileInfo
 * stats the file and re-registers it on the local-file:// allowlist).
 * Returns surviving paths in original order plus the number dropped.
 */
export async function validateCachedPaths(
  paths: string[]
): Promise<{ valid: string[]; dropped: number }> {
  const checks = await Promise.all(
    paths.map(async (path) => {
      try {
        await window.api.app.getFileInfo(path)
        return path
      } catch {
        return null
      }
    })
  )
  const valid = checks.filter((path): path is string => path !== null)
  return { valid, dropped: paths.length - valid.length }
}
