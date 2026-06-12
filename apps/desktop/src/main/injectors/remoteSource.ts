import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { is } from '@electron-toolkit/utils'
import { app } from 'electron'
import { injectorRegistry, SUPPORTED_INJECTOR_SCHEMA, type RemoteBundleRecord } from './registry'
import { INJECTOR_MANIFEST_PATH, RemoteInjectorManifestSchema, type RemoteInjectorEntry } from './remoteSchema'

const FETCH_TIMEOUT_MS = 15_000

// Keep in sync with packages/injectors/build/normalize.mjs. The manifest sha is
// computed over the path-normalized bundle, so download verification must use the
// identical transform. Inlined (not imported from @multipost/injectors) so the
// main-process bundle never pulls in the build package / esbuild.
function normalizeBundle(iife: string): string {
  return iife.replace(/^(\s*\/\/ )[^\n]*\/([^/\n]+\.(?:ts|tsx|js|jsx|mjs|json))$/gm, '$1$2')
}

function webBaseUrl(): string {
  return is.dev ? process.env.MULTIPOST_WEB_URL || 'http://localhost:3000' : 'https://multipost.app'
}

function cacheRoot(): string {
  return join(app.getPath('userData'), 'injector-cache')
}

function indexPath(): string {
  return join(cacheRoot(), 'index.json')
}

function normalizedSha(iife: string): string {
  return createHash('sha256').update(normalizeBundle(iife), 'utf8').digest('hex')
}

interface CacheIndexEntry {
  sha256: string
  schemaVersion: number
  file: string
}

interface CacheIndex {
  entries: Record<string, CacheIndexEntry>
}

function readIndex(): CacheIndex {
  try {
    if (!existsSync(indexPath())) return { entries: {} }
    const parsed = JSON.parse(readFileSync(indexPath(), 'utf-8')) as CacheIndex
    return parsed && typeof parsed === 'object' && parsed.entries ? parsed : { entries: {} }
  } catch {
    return { entries: {} }
  }
}

function writeIndex(index: CacheIndex): void {
  try {
    mkdirSync(cacheRoot(), { recursive: true })
    writeFileSync(indexPath(), JSON.stringify(index, null, 2))
  } catch (error) {
    console.warn('[InjectorHotUpdate] failed to write cache index:', error)
  }
}

async function fetchText(url: string): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) return null
    return await res.text()
  } catch (error) {
    console.warn(`[InjectorHotUpdate] fetch failed for ${url}:`, error instanceof Error ? error.message : error)
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Synchronously hydrate the registry from the on-disk cache at startup. Each
 * cached bundle is re-hashed and verified against the index before use, so a
 * tampered or corrupted file is dropped (falls back to built-in). Never throws.
 */
export function loadCachedBundles(): Record<string, RemoteBundleRecord> {
  const records: Record<string, RemoteBundleRecord> = {}
  try {
    const index = readIndex()
    for (const [key, entry] of Object.entries(index.entries)) {
      try {
        const file = join(cacheRoot(), entry.file)
        if (!existsSync(file)) continue
        const iife = readFileSync(file, 'utf-8')
        // Tamper check: cached bytes must still hash to the recorded sha.
        if (normalizedSha(iife) !== entry.sha256) continue
        records[key] = { iife, sha256: entry.sha256, schemaVersion: entry.schemaVersion }
      } catch {
        // Skip just this key; one bad cache file must never break startup.
      }
    }
  } catch (error) {
    console.warn('[InjectorHotUpdate] failed to load cache:', error)
  }
  return records
}

/**
 * Only allow same-origin URLs under /injectors/, so a tampered manifest can never
 * point the desktop at an arbitrary host.
 */
function resolveBundleUrl(base: string, url: string): string | null {
  try {
    const resolved = new URL(url, base)
    if (resolved.origin !== new URL(base).origin) return null
    if (!resolved.pathname.startsWith('/injectors/')) return null
    return resolved.toString()
  } catch {
    return null
  }
}

function shouldFetch(entry: RemoteInjectorEntry): boolean {
  if (entry.schemaVersion > SUPPORTED_INJECTOR_SCHEMA) return false
  const builtinSha = injectorRegistry.getBuiltinSha(entry.extensionKey)
  if (builtinSha === undefined) return false // unknown key — never fetch
  // Only download when the remote content actually differs from built-in.
  return entry.sha256 !== builtinSha
}

/**
 * Fetch the manifest, download changed/known bundles, verify sha, persist to
 * cache, and return the validated records. Best-effort: returns {} on any
 * failure and skips just the offending entry on a per-bundle problem.
 */
export async function fetchRemoteBundles(): Promise<Record<string, RemoteBundleRecord>> {
  const base = webBaseUrl()
  const manifestText = await fetchText(`${base}${INJECTOR_MANIFEST_PATH}`)
  if (!manifestText) return {}

  let manifest
  try {
    manifest = RemoteInjectorManifestSchema.parse(JSON.parse(manifestText))
  } catch (error) {
    console.warn('[InjectorHotUpdate] manifest validate failed:', error instanceof Error ? error.message : error)
    return {}
  }

  const index = readIndex()
  const records: Record<string, RemoteBundleRecord> = {}

  for (const entry of manifest.entries) {
    try {
      if (!shouldFetch(entry)) continue
      const url = resolveBundleUrl(base, entry.url)
      if (!url) continue
      const iife = await fetchText(url)
      if (!iife) continue
      // Integrity: downloaded content must hash to the manifest sha.
      if (normalizedSha(iife) !== entry.sha256) {
        console.warn(`[InjectorHotUpdate] sha mismatch for ${entry.extensionKey}, skipping`)
        continue
      }
      const file = join(entry.extensionKey, `${entry.sha256.slice(0, 16)}.js`)
      mkdirSync(join(cacheRoot(), entry.extensionKey), { recursive: true })
      writeFileSync(join(cacheRoot(), file), iife)
      index.entries[entry.extensionKey] = { sha256: entry.sha256, schemaVersion: entry.schemaVersion, file }
      records[entry.extensionKey] = { iife, sha256: entry.sha256, schemaVersion: entry.schemaVersion }
    } catch (error) {
      console.warn(
        `[InjectorHotUpdate] failed to process ${entry.extensionKey}:`,
        error instanceof Error ? error.message : error
      )
    }
  }

  if (Object.keys(records).length > 0) writeIndex(index)
  return records
}
