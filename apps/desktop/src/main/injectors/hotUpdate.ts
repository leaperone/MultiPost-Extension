import { getInjectorHotUpdateEnabled } from '../appSettings'
import { injectorRegistry } from './registry'
import { fetchRemoteBundles, loadCachedBundles } from './remoteSource'

const FIRST_CHECK_DELAY_MS = 10_000
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000

let started = false

/**
 * Wire up injector hot-update. Safe to call unconditionally during startup: it
 * never throws and never blocks window creation.
 *
 * When the feature flag is OFF it returns immediately and touches neither the
 * cache nor the network, so desktop runs purely on its built-in bundles — the
 * flag is a true escape hatch. When ON, it first hydrates from the verified
 * on-disk cache (instant, last-known-good remote scripts), then schedules a
 * delayed first check followed by periodic checks.
 */
export function initInjectorHotUpdate(): void {
  if (started) return
  started = true

  try {
    if (!getInjectorHotUpdateEnabled()) return

    const cached = loadCachedBundles()
    if (Object.keys(cached).length > 0) {
      injectorRegistry.applyRemote(cached)
    }

    setTimeout(() => {
      void checkRemote()
      // unref() so this background timer never holds the process open at quit.
      setInterval(() => void checkRemote(), CHECK_INTERVAL_MS).unref()
    }, FIRST_CHECK_DELAY_MS)
  } catch (error) {
    console.warn('[InjectorHotUpdate] init failed (using built-in only):', error)
  }
}

async function checkRemote(): Promise<void> {
  try {
    if (!getInjectorHotUpdateEnabled()) return
    const records = await fetchRemoteBundles()
    const count = Object.keys(records).length
    if (count > 0) {
      injectorRegistry.applyRemote(records)
      console.log(`[InjectorHotUpdate] applied ${count} remote bundle(s)`)
    }
  } catch (error) {
    console.warn('[InjectorHotUpdate] check failed:', error)
  }
}
