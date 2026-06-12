// Thin desktop adapter over the shared @multipost/injectors build pipeline.
//
// Batch 0C: source roots now point at the packages/injectors own src tree — the
// 71 injector scripts + types + content helper were migrated out of the
// apps/extension submodule, so desktop (and later web) no longer depend on the
// submodule being checked out. Output stays behavior-equivalent to the
// pre-migration baseline; verify with:
//   pnpm hash:injectors --check <normalized-baseline> --normalize
//
// Re-exports the exact symbols electron.vite.config.ts / verify-injector-bundles
// / hash-injector-bundles consume, so no consumer changes in this batch.
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createInjectorBuilder,
  DEFAULT_INJECTOR_GLOBAL_NAME,
  INJECTOR_BUNDLES_RESOLVED_ID,
  INJECTOR_BUNDLES_VIRTUAL_ID,
  INJECTOR_CONTENT_HELPER_RESOLVED_ID,
  INJECTOR_CONTENT_HELPER_VIRTUAL_ID
} from '@multipost/injectors/build'

const scriptDir = dirname(fileURLToPath(import.meta.url))
export const DESKTOP_ROOT = resolve(scriptDir, '..')
export const INJECTORS_ROOT = resolve(DESKTOP_ROOT, '../../packages/injectors')
export const INJECTORS_SRC_ROOT = resolve(INJECTORS_ROOT, 'src')
export const BUNDLE_ENTRIES_PATH = resolve(DESKTOP_ROOT, 'src/main/injectors/bundleEntries.json')
export const CONTENT_HELPER_ENTRY_PATH = resolve(INJECTORS_SRC_ROOT, 'helper.ts')

export const INJECTOR_GLOBAL_NAME = DEFAULT_INJECTOR_GLOBAL_NAME
export {
  INJECTOR_BUNDLES_VIRTUAL_ID,
  INJECTOR_BUNDLES_RESOLVED_ID,
  INJECTOR_CONTENT_HELPER_VIRTUAL_ID,
  INJECTOR_CONTENT_HELPER_RESOLVED_ID
}

const builder = createInjectorBuilder({
  sourceRoot: INJECTORS_SRC_ROOT,
  syncRoot: INJECTORS_SRC_ROOT,
  contentsRoot: INJECTORS_SRC_ROOT,
  entriesPath: BUNDLE_ENTRIES_PATH,
  contentHelperEntry: CONTENT_HELPER_ENTRY_PATH,
  tsconfigPath: resolve(INJECTORS_ROOT, 'tsconfig.json'),
  absWorkingDir: DESKTOP_ROOT,
  globalName: DEFAULT_INJECTOR_GLOBAL_NAME,
  forbiddenSyncValueFiles: [],
  injectorSourcefilePrefix: 'desktop-injector-',
  contentHelperSourcefile: 'desktop-content-helper.ts'
})

export const loadDesktopInjectorBundleEntries = builder.loadEntries
export const getInjectorEntryAbsolutePath = builder.getEntryAbsolutePath
export const buildDesktopInjectorBundleResult = builder.buildBundleResult
export const buildDesktopContentHelperBundleResult = builder.buildContentHelperResult
export const createInjectorBundlesModuleCode = builder.createBundlesModuleCode
export const createInjectorContentHelperModuleCode = builder.createContentHelperModuleCode
export const injectorBundlesVirtualModulePlugin = builder.bundlesVirtualModulePlugin
export const injectorContentHelperVirtualModulePlugin = builder.contentHelperVirtualModulePlugin

export async function buildDesktopInjectorBundles(options) {
  return (await builder.buildBundleResult(options)).bundles
}
