import injectorBundles, { injectorBundleMeta } from 'virtual:injector-bundles'

/**
 * syncData contract version this desktop build understands. A remote (hot-updated)
 * bundle is only ever selected when its `schemaVersion <= SUPPORTED_INJECTOR_SCHEMA`.
 */
export const SUPPORTED_INJECTOR_SCHEMA = 1

/** Consecutive runtime failures of a remote bundle before it is quarantined. */
const FAILURE_THRESHOLD = 2

export interface RemoteBundleRecord {
  iife: string
  sha256: string
  schemaVersion: number
}

export interface ActiveBundle {
  iife: string
  isRemote: boolean
  /** sha of the selected bundle (remote sha when remote, else built-in sha). */
  sha: string | undefined
}

/**
 * Single source of truth for "which injector bundle string to inject for a key".
 *
 * - Built-in layer: the bundles compiled into this desktop build. Always present,
 *   the authoritative fallback.
 * - Remote layer: hot-updated bundles pulled from web (best-effort).
 *
 * Hard invariant (the whole feature's safety guarantee): selection is synchronous,
 * MUST NOT throw, and MUST NOT return anything worse than built-in. Any failure in
 * remote selection degrades silently to built-in, so injection behaves exactly as
 * it does with no hot-update at all.
 */
class InjectorRegistry {
  /** Hot-updated bundles, keyed by extensionKey. */
  private readonly remote = new Map<string, RemoteBundleRecord>()
  /** `${key}@${sha}` records quarantined after repeated runtime failure. */
  private readonly bad = new Set<string>()
  /** `${key}@${sha}` -> consecutive failure count, until it trips FAILURE_THRESHOLD. */
  private readonly fails = new Map<string, number>()

  /** Convenience read point. Sync, never throws, falls back to built-in. */
  getBundle(key: string): string | undefined {
    return this.getActiveBundle(key)?.iife
  }

  /**
   * The bundle to inject right now plus whether it came from the remote layer, so
   * the caller can retry the built-in in the same operation if a remote bundle
   * fails. Sync, never throws, never returns worse than built-in.
   */
  getActiveBundle(key: string): ActiveBundle | undefined {
    try {
      const remote = this.remote.get(key)
      if (remote && this.isRemoteSelectable(key, remote)) {
        return { iife: remote.iife, isRemote: true, sha: remote.sha256 }
      }
    } catch {
      // Any error in remote selection degrades to built-in below.
    }
    const builtin = injectorBundles[key]
    if (builtin === undefined) return undefined
    return { iife: builtin, isRemote: false, sha: injectorBundleMeta[key]?.sha256 }
  }

  /** Force the built-in bundle — the same-call fallback when a remote bundle fails. */
  getBuiltinBundle(key: string): string | undefined {
    return injectorBundles[key]
  }

  /** sha256 of the built-in bundle for a key (used to tell if a remote differs). */
  getBuiltinSha(key: string): string | undefined {
    return injectorBundleMeta[key]?.sha256
  }

  /**
   * Merge freshly fetched/cached bundles into the remote layer. Best-effort and
   * intentionally narrow: only keys that exist in the built-in set are accepted,
   * so a remote manifest can never inject into an unexpected platform page.
   */
  applyRemote(records: Record<string, RemoteBundleRecord>): void {
    for (const [key, record] of Object.entries(records)) {
      if (!(key in injectorBundles)) continue
      this.remote.set(key, record)
    }
  }

  /**
   * Record a remote bundle's runtime outcome. After FAILURE_THRESHOLD consecutive
   * failures the (key, sha) is quarantined and never selected again until a newer
   * sha ships. Success resets the counter. The breaker is a SECOND line of defense:
   * the first is the same-call built-in retry in executeExtensionFill.
   */
  reportResult(key: string, sha: string, ok: boolean): void {
    const id = `${key}@${sha}`
    if (ok) {
      this.fails.delete(id)
      return
    }
    const next = (this.fails.get(id) ?? 0) + 1
    this.fails.set(id, next)
    if (next >= FAILURE_THRESHOLD) {
      this.bad.add(id)
      this.fails.delete(id)
    }
  }

  private isRemoteSelectable(key: string, remote: RemoteBundleRecord): boolean {
    if (this.bad.has(`${key}@${remote.sha256}`)) return false
    if (remote.schemaVersion > SUPPORTED_INJECTOR_SCHEMA) return false
    // Only override built-in when the remote content actually differs from it.
    return remote.sha256 !== injectorBundleMeta[key]?.sha256
  }
}

export const injectorRegistry = new InjectorRegistry()
