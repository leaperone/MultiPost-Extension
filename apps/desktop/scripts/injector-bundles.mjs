import { existsSync, statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

export const INJECTOR_BUNDLES_VIRTUAL_ID = 'virtual:injector-bundles'
export const INJECTOR_BUNDLES_RESOLVED_ID = '\0virtual:injector-bundles'
export const INJECTOR_GLOBAL_NAME = '__MULTIPOST_DESKTOP_INJECTOR__'

const scriptDir = dirname(fileURLToPath(import.meta.url))
export const DESKTOP_ROOT = resolve(scriptDir, '..')
export const EXTENSION_ROOT = resolve(DESKTOP_ROOT, '../extension')
export const EXTENSION_SRC_ROOT = resolve(EXTENSION_ROOT, 'src')
export const EXTENSION_SYNC_ROOT = resolve(EXTENSION_SRC_ROOT, 'sync')
export const BUNDLE_ENTRIES_PATH = resolve(DESKTOP_ROOT, 'src/main/injectors/bundleEntries.json')

const extensionResolutionSuffixes = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.json']
const forbiddenSyncValueModules = new Set(
  ['common.ts', 'article.ts', 'dynamic.ts', 'video.ts', 'podcast.ts'].map((file) => resolve(EXTENSION_SYNC_ROOT, file))
)

function isInside(parent, child) {
  const path = relative(parent, child)
  return path === '' || (!!path && !path.startsWith('..') && !isAbsolute(path))
}

function resolveExistingModule(basePath) {
  const candidates = []
  for (const suffix of extensionResolutionSuffixes) {
    candidates.push(`${basePath}${suffix}`)
  }
  for (const suffix of extensionResolutionSuffixes) {
    candidates.push(resolve(basePath, `index${suffix}`))
  }

  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return candidate
    }
  }
  return null
}

function resolveExtensionImport(importPath, importer) {
  if (importPath.startsWith('~')) {
    return resolveExistingModule(resolve(EXTENSION_SRC_ROOT, importPath.slice(1)))
  }
  if (importPath.startsWith('@ext/')) {
    return resolveExistingModule(resolve(EXTENSION_SRC_ROOT, importPath.slice('@ext/'.length)))
  }
  if (importPath.startsWith('.') && importer) {
    return resolveExistingModule(resolve(dirname(importer), importPath))
  }
  return null
}

function createExtensionImportGuard(entry) {
  return {
    name: 'multipost-desktop-extension-import-guard',
    setup(pluginBuild) {
      pluginBuild.onResolve({ filter: /.*/ }, (args) => {
        const resolved = resolveExtensionImport(args.path, args.importer)
        if (resolved && forbiddenSyncValueModules.has(resolved)) {
          return {
            errors: [
              {
                text:
                  `Desktop injector bundle ${entry.extensionKey} cannot value-import ${args.path}. ` +
                  'Use import type for SyncData/common types; extension common.ts and parent InfoMap modules pull extension runtime state.'
              }
            ]
          }
        }

        if (args.path.startsWith('~') || args.path.startsWith('@ext/')) {
          if (!resolved) {
            return {
              errors: [
                {
                  text: `Unable to resolve extension import ${args.path} for desktop injector bundle ${entry.extensionKey}`
                }
              ]
            }
          }
          return { path: resolved }
        }

        return null
      })
    }
  }
}

export async function loadDesktopInjectorBundleEntries() {
  const raw = await readFile(BUNDLE_ENTRIES_PATH, 'utf8')
  const entries = JSON.parse(raw)
  if (!Array.isArray(entries)) {
    throw new Error(`Desktop injector bundle entries must be an array: ${BUNDLE_ENTRIES_PATH}`)
  }
  return entries
}

export function getInjectorEntryAbsolutePath(entry) {
  const sourcePath = resolve(EXTENSION_SYNC_ROOT, entry.source)
  if (!isInside(EXTENSION_SYNC_ROOT, sourcePath)) {
    throw new Error(`Desktop injector bundle source escapes extension sync root: ${entry.source}`)
  }
  return sourcePath
}

async function buildDesktopInjectorBundle(entry) {
  const entryPath = getInjectorEntryAbsolutePath(entry)
  const result = await build({
    stdin: {
      contents: `import { ${entry.exportName} as injector } from ${JSON.stringify(entryPath)};\nexport { injector };\n`,
      loader: 'ts',
      resolveDir: EXTENSION_SYNC_ROOT,
      sourcefile: `desktop-injector-${entry.extensionKey}.ts`
    },
    absWorkingDir: DESKTOP_ROOT,
    bundle: true,
    format: 'iife',
    globalName: INJECTOR_GLOBAL_NAME,
    platform: 'browser',
    target: 'es2022',
    minify: false,
    write: false,
    metafile: true,
    tsconfig: resolve(EXTENSION_ROOT, 'tsconfig.json'),
    plugins: [createExtensionImportGuard(entry)]
  })

  const output = result.outputFiles?.[0]?.text
  if (!output) {
    throw new Error(`esbuild produced no output for desktop injector bundle ${entry.extensionKey}`)
  }

  return {
    iife: output,
    inputFiles: Object.keys(result.metafile?.inputs ?? {}).map((input) => resolve(DESKTOP_ROOT, input))
  }
}

export async function buildDesktopInjectorBundleResult({ log = false } = {}) {
  const entries = await loadDesktopInjectorBundleEntries()
  const bundles = {}
  const watchFiles = new Set([BUNDLE_ENTRIES_PATH])

  for (const entry of entries) {
    const { iife, inputFiles } = await buildDesktopInjectorBundle(entry)
    bundles[entry.extensionKey] = iife
    watchFiles.add(getInjectorEntryAbsolutePath(entry))
    for (const inputFile of inputFiles) {
      watchFiles.add(inputFile)
    }
    if (log) {
      console.log(`[injector-bundles] ${entry.extensionKey}: ${Buffer.byteLength(iife, 'utf8')} bytes`)
    }
  }

  if (log) {
    console.log(`[injector-bundles] built ${entries.length} desktop injector bundles`)
  }

  return { bundles, entries, watchFiles: [...watchFiles] }
}

export async function buildDesktopInjectorBundles(options) {
  return (await buildDesktopInjectorBundleResult(options)).bundles
}

export function createInjectorBundlesModuleCode(bundles) {
  return [
    `export const injectorGlobalName = ${JSON.stringify(INJECTOR_GLOBAL_NAME)};`,
    `export const injectorBundles = ${JSON.stringify(bundles, null, 2)};`,
    'export default injectorBundles;'
  ].join('\n')
}

export function injectorBundlesVirtualModulePlugin() {
  return {
    name: 'multipost-desktop-injector-bundles',
    enforce: 'pre',
    resolveId(id) {
      if (id === INJECTOR_BUNDLES_VIRTUAL_ID) {
        return INJECTOR_BUNDLES_RESOLVED_ID
      }
      return null
    },
    async load(id) {
      if (id !== INJECTOR_BUNDLES_RESOLVED_ID) {
        return null
      }

      const result = await buildDesktopInjectorBundleResult({ log: true })
      for (const watchFile of result.watchFiles) {
        this.addWatchFile(watchFile)
      }
      return createInjectorBundlesModuleCode(result.bundles)
    }
  }
}
