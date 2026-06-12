// Parameterized, Node-only build API for MultiPost platform injector bundles.
//
// This is the single esbuild pipeline shared by desktop (compiles to built-in
// IIFE bundles injected at runtime) and web (emits static bundles for hot
// update). Every path is a config parameter so a caller can point it at the
// extension submodule (Batch 0B, byte-identical output) or at this package's
// own src tree (Batch 0C onward). It deliberately mirrors the original
// apps/desktop/scripts/injector-bundles.mjs so output stays stable.
import { createHash } from 'node:crypto'
import { existsSync, statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import { build } from 'esbuild'
import { normalizeBundle } from './normalize.mjs'

export const INJECTOR_BUNDLES_VIRTUAL_ID = 'virtual:injector-bundles'
export const INJECTOR_BUNDLES_RESOLVED_ID = '\0virtual:injector-bundles'
export const INJECTOR_CONTENT_HELPER_VIRTUAL_ID = 'virtual:injector-content-helper'
export const INJECTOR_CONTENT_HELPER_RESOLVED_ID = '\0virtual:injector-content-helper'
export const DEFAULT_INJECTOR_GLOBAL_NAME = '__MULTIPOST_DESKTOP_INJECTOR__'

// syncData contract version baked into the built-in bundles. A remote (hot-updated)
// bundle is only loaded when its schemaVersion <= this. Bump when syncData changes.
export const INJECTOR_SCHEMA_VERSION = 1

const RESOLUTION_SUFFIXES = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.json']

function isInside(parent, child) {
  const path = relative(parent, child)
  return path === '' || (!!path && !path.startsWith('..') && !isAbsolute(path))
}

function resolveExistingModule(basePath) {
  const candidates = []
  for (const suffix of RESOLUTION_SUFFIXES) candidates.push(`${basePath}${suffix}`)
  for (const suffix of RESOLUTION_SUFFIXES) candidates.push(resolve(basePath, `index${suffix}`))
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
  }
  return null
}

export function sha256Hex(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

// Re-exported from the dependency-free module so the meta sha (computed here)
// and the web manifest sha agree for identical source, and so the Electron main
// process can import normalize for download verification without pulling esbuild.
export { normalizeBundle }

/**
 * @param {object} config
 * @param {string} config.sourceRoot         Base for `~` / `@ext/` alias resolution (extension/src or package/src).
 * @param {string} config.syncRoot           Root the per-entry `source` paths resolve under.
 * @param {string} config.contentsRoot       Root for the content-helper resolveDir.
 * @param {string} config.entriesPath        Absolute path to the bundle entries JSON.
 * @param {string} config.contentHelperEntry Absolute path to the content-helper entry file.
 * @param {string} config.tsconfigPath       tsconfig passed to esbuild.
 * @param {string} config.absWorkingDir      esbuild absWorkingDir (also the base for watchFile resolution).
 * @param {string} [config.globalName]       IIFE global name.
 * @param {string[]} [config.forbiddenSyncValueFiles] sync-root-relative files that may only be type-imported.
 * @param {string} [config.injectorSourcefilePrefix]  esbuild stdin sourcefile prefix per entry.
 * @param {string} [config.contentHelperSourcefile]   esbuild stdin sourcefile for the helper.
 */
export function createInjectorBuilder(config) {
  const {
    sourceRoot,
    syncRoot,
    contentsRoot,
    entriesPath,
    contentHelperEntry,
    tsconfigPath,
    absWorkingDir,
    globalName = DEFAULT_INJECTOR_GLOBAL_NAME,
    forbiddenSyncValueFiles = [],
    injectorSourcefilePrefix = 'desktop-injector-',
    contentHelperSourcefile = 'desktop-content-helper.ts'
  } = config

  const forbiddenValueModules = new Set(forbiddenSyncValueFiles.map((file) => resolve(syncRoot, file)))

  function resolveAliasImport(importPath, importer) {
    if (importPath.startsWith('~')) return resolveExistingModule(resolve(sourceRoot, importPath.slice(1)))
    if (importPath.startsWith('@ext/')) return resolveExistingModule(resolve(sourceRoot, importPath.slice('@ext/'.length)))
    if (importPath.startsWith('.') && importer) return resolveExistingModule(resolve(dirname(importer), importPath))
    return null
  }

  function importGuard(entry) {
    return {
      name: 'multipost-injector-import-guard',
      setup(pluginBuild) {
        pluginBuild.onResolve({ filter: /.*/ }, (args) => {
          const resolved = resolveAliasImport(args.path, args.importer)
          if (resolved && forbiddenValueModules.has(resolved)) {
            return {
              errors: [
                {
                  text:
                    `Injector bundle ${entry.extensionKey} cannot value-import ${args.path}. ` +
                    'Use import type for SyncData/common types; common.ts and parent InfoMap modules pull extension runtime state.'
                }
              ]
            }
          }
          if (args.path.startsWith('~') || args.path.startsWith('@ext/')) {
            if (!resolved) {
              return { errors: [{ text: `Unable to resolve import ${args.path} for injector bundle ${entry.extensionKey}` }] }
            }
            return { path: resolved }
          }
          return null
        })
      }
    }
  }

  async function loadEntries() {
    const raw = await readFile(entriesPath, 'utf8')
    const entries = JSON.parse(raw)
    if (!Array.isArray(entries)) throw new Error(`Injector bundle entries must be an array: ${entriesPath}`)
    return entries
  }

  function getEntryAbsolutePath(entry) {
    const sourcePath = resolve(syncRoot, entry.source)
    if (!isInside(syncRoot, sourcePath)) throw new Error(`Injector bundle source escapes sync root: ${entry.source}`)
    return sourcePath
  }

  async function buildBundle(entry) {
    const entryPath = getEntryAbsolutePath(entry)
    const result = await build({
      stdin: {
        contents: `import { ${entry.exportName} as injector } from ${JSON.stringify(entryPath)};\nexport { injector };\n`,
        loader: 'ts',
        resolveDir: syncRoot,
        sourcefile: `${injectorSourcefilePrefix}${entry.extensionKey}.ts`
      },
      absWorkingDir,
      bundle: true,
      format: 'iife',
      globalName,
      platform: 'browser',
      target: 'es2022',
      minify: false,
      write: false,
      metafile: true,
      tsconfig: tsconfigPath,
      plugins: [importGuard(entry)]
    })

    const output = result.outputFiles?.[0]?.text
    if (!output) throw new Error(`esbuild produced no output for injector bundle ${entry.extensionKey}`)

    return {
      iife: output,
      inputFiles: Object.keys(result.metafile?.inputs ?? {}).map((input) => resolve(absWorkingDir, input))
    }
  }

  async function buildBundleResult({ log = false } = {}) {
    const entries = await loadEntries()
    const bundles = {}
    const watchFiles = new Set([entriesPath])

    for (const entry of entries) {
      const { iife, inputFiles } = await buildBundle(entry)
      bundles[entry.extensionKey] = iife
      watchFiles.add(getEntryAbsolutePath(entry))
      for (const inputFile of inputFiles) watchFiles.add(inputFile)
      if (log) console.log(`[injector-bundles] ${entry.extensionKey}: ${Buffer.byteLength(iife, 'utf8')} bytes`)
    }

    if (log) console.log(`[injector-bundles] built ${entries.length} injector bundles`)
    return { bundles, entries, watchFiles: [...watchFiles] }
  }

  async function buildContentHelperResult({ log = false } = {}) {
    const result = await build({
      stdin: {
        contents: `import ${JSON.stringify(contentHelperEntry)};\n`,
        loader: 'ts',
        resolveDir: contentsRoot,
        sourcefile: contentHelperSourcefile
      },
      absWorkingDir,
      bundle: true,
      format: 'iife',
      platform: 'browser',
      target: 'es2022',
      minify: false,
      write: false,
      metafile: true,
      tsconfig: tsconfigPath,
      plugins: [importGuard({ extensionKey: 'CONTENT_HELPER' })]
    })

    const output = result.outputFiles?.[0]?.text
    if (!output) throw new Error('esbuild produced no output for content helper bundle')

    const watchFiles = new Set([contentHelperEntry])
    for (const input of Object.keys(result.metafile?.inputs ?? {})) watchFiles.add(resolve(absWorkingDir, input))
    if (log) console.log(`[injector-content-helper] built ${Buffer.byteLength(output, 'utf8')} bytes`)
    return { iife: output, watchFiles: [...watchFiles] }
  }

  /** Per-key metadata (content hash + schema) shipped alongside the built-in bundles. */
  function buildBundleMeta(bundles) {
    const meta = {}
    for (const [key, iife] of Object.entries(bundles)) {
      meta[key] = { sha256: sha256Hex(normalizeBundle(iife)), schemaVersion: INJECTOR_SCHEMA_VERSION }
    }
    return meta
  }

  function createBundlesModuleCode(bundles) {
    return [
      `export const injectorGlobalName = ${JSON.stringify(globalName)};`,
      `export const injectorBundles = ${JSON.stringify(bundles, null, 2)};`,
      `export const injectorBundleMeta = ${JSON.stringify(buildBundleMeta(bundles), null, 2)};`,
      'export default injectorBundles;'
    ].join('\n')
  }

  function createContentHelperModuleCode(contentHelperBundle) {
    return [
      `export const contentHelperBundle = ${JSON.stringify(contentHelperBundle)};`,
      'export default contentHelperBundle;'
    ].join('\n')
  }

  function bundlesVirtualModulePlugin() {
    return {
      name: 'multipost-injector-bundles',
      enforce: 'pre',
      resolveId(id) {
        if (id === INJECTOR_BUNDLES_VIRTUAL_ID) return INJECTOR_BUNDLES_RESOLVED_ID
        return null
      },
      async load(id) {
        if (id !== INJECTOR_BUNDLES_RESOLVED_ID) return null
        const result = await buildBundleResult({ log: true })
        for (const watchFile of result.watchFiles) this.addWatchFile(watchFile)
        return createBundlesModuleCode(result.bundles)
      }
    }
  }

  function contentHelperVirtualModulePlugin() {
    return {
      name: 'multipost-injector-content-helper',
      enforce: 'pre',
      resolveId(id) {
        if (id === INJECTOR_CONTENT_HELPER_VIRTUAL_ID) return INJECTOR_CONTENT_HELPER_RESOLVED_ID
        return null
      },
      async load(id) {
        if (id !== INJECTOR_CONTENT_HELPER_RESOLVED_ID) return null
        const result = await buildContentHelperResult({ log: true })
        for (const watchFile of result.watchFiles) this.addWatchFile(watchFile)
        return createContentHelperModuleCode(result.iife)
      }
    }
  }

  return {
    loadEntries,
    getEntryAbsolutePath,
    buildBundleResult,
    buildContentHelperResult,
    buildBundleMeta,
    createBundlesModuleCode,
    createContentHelperModuleCode,
    bundlesVirtualModulePlugin,
    contentHelperVirtualModulePlugin
  }
}
