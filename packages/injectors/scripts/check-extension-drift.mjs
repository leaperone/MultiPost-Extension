// Guards against drift between the canonical injector scripts in
// packages/injectors/src and the copies still living in the apps/extension
// submodule (which updates independently). Both trees are compiled and compared
// by path-normalized bundle sha, so import-style differences (`~sync/common`
// type-import vs `../types`) — erased at compile time — never count as drift;
// only real logic changes do.
//
// Keyed from the desktop bundle entries, so only the 71 desktop-supported
// scripts are checked. Skips cleanly when the extension submodule is absent.
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createInjectorBuilder, normalizeBundle, sha256Hex } from '../build/index.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const pkgRoot = path.resolve(here, '..')
const monorepoRoot = path.resolve(pkgRoot, '../..')
const pkgSrc = path.join(pkgRoot, 'src')
const extRoot = path.join(monorepoRoot, 'apps/extension')
const extSrc = path.join(extRoot, 'src')
const entriesPath = path.join(monorepoRoot, 'apps/desktop/src/main/injectors/bundleEntries.json')

if (!existsSync(path.join(extSrc, 'sync'))) {
  console.log('[injector-drift] extension submodule not checked out — skipping drift check')
  process.exit(0)
}

const pkgBuilder = createInjectorBuilder({
  sourceRoot: pkgSrc,
  syncRoot: pkgSrc,
  contentsRoot: pkgSrc,
  entriesPath,
  contentHelperEntry: path.join(pkgSrc, 'helper.ts'),
  tsconfigPath: path.join(pkgRoot, 'tsconfig.json'),
  absWorkingDir: pkgRoot
})

const extBuilder = createInjectorBuilder({
  sourceRoot: extSrc,
  syncRoot: path.join(extSrc, 'sync'),
  contentsRoot: path.join(extSrc, 'contents'),
  entriesPath,
  contentHelperEntry: path.join(extSrc, 'contents/helper.ts'),
  tsconfigPath: path.join(extRoot, 'tsconfig.json'),
  absWorkingDir: extRoot,
  forbiddenSyncValueFiles: ['common.ts', 'article.ts', 'dynamic.ts', 'video.ts', 'podcast.ts']
})

const nsha = (iife) => sha256Hex(normalizeBundle(iife))

const pkg = (await pkgBuilder.buildBundleResult()).bundles
const ext = (await extBuilder.buildBundleResult()).bundles

const drifted = []
for (const key of Object.keys(pkg)) {
  const p = nsha(pkg[key])
  const e = ext[key] ? nsha(ext[key]) : null
  if (e === null) {
    drifted.push(`${key}: missing in extension`)
  } else if (p !== e) {
    drifted.push(`${key}: packages ${p.slice(0, 10)} vs extension ${e.slice(0, 10)}`)
  }
}

const pkgHelper = nsha((await pkgBuilder.buildContentHelperResult()).iife)
const extHelper = nsha((await extBuilder.buildContentHelperResult()).iife)
if (pkgHelper !== extHelper) {
  drifted.push(`content-helper: packages ${pkgHelper.slice(0, 10)} vs extension ${extHelper.slice(0, 10)}`)
}

if (drifted.length > 0) {
  console.error(`[injector-drift] ${drifted.length} script(s) drifted between extension and packages/injectors:`)
  for (const d of drifted) console.error(`  ${d}`)
  console.error('Sync the changed platform script across both trees (or update the other side).')
  process.exit(1)
}

console.log(`[injector-drift] OK — ${Object.keys(pkg).length} scripts + helper match between extension and packages/injectors`)
