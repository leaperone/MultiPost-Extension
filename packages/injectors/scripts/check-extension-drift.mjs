// Guards against drift between the canonical injector scripts in
// packages/injectors/src and the copies still living in the apps/extension
// submodule (which updates independently). Fails CI if a platform fix made on one
// side is missed on the other.
//
// Sync scripts are compared as SOURCE TEXT (not compiled), so the check needs no
// third-party deps (e.g. turndown) installed in the extension submodule. The only
// migration-induced difference is the common type-import path (../types here vs
// ../common / ~sync/common there) — type-only, erased at compile time — which is
// normalized away; any other text difference is real drift.
//
// The content-helper entry was intentionally rewritten on migration (Plasmo
// config dropped), so its source differs by design; it is compared as the
// compiled+normalized bundle instead (no third-party deps, so the extension side
// compiles cleanly). Keyed from the desktop bundle entries; skips when the
// extension submodule is absent.
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
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

const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex')

function normalizeSyncSource(code) {
  return code.replace(/from\s+["'](?:\.\.\/types|\.\.\/common|~sync\/common)["']/g, 'from "<common>"')
}

const entries = JSON.parse(readFileSync(entriesPath, 'utf8'))
const drifted = []

for (const e of entries) {
  const pkgFile = path.join(pkgSrc, e.source)
  const extFile = path.join(extSrc, 'sync', e.source)
  if (!existsSync(extFile)) {
    drifted.push(`${e.source}: missing in extension`)
    continue
  }
  if (!existsSync(pkgFile)) {
    drifted.push(`${e.source}: missing in packages`)
    continue
  }
  if (
    sha(normalizeSyncSource(readFileSync(pkgFile, 'utf8'))) !==
    sha(normalizeSyncSource(readFileSync(extFile, 'utf8')))
  ) {
    drifted.push(`${e.source}: source drift`)
  }
}

try {
  const pkgHelper = createInjectorBuilder({
    sourceRoot: pkgSrc,
    syncRoot: pkgSrc,
    contentsRoot: pkgSrc,
    entriesPath,
    contentHelperEntry: path.join(pkgSrc, 'helper.ts'),
    tsconfigPath: path.join(pkgRoot, 'tsconfig.json'),
    absWorkingDir: pkgRoot
  })
  const extHelper = createInjectorBuilder({
    sourceRoot: extSrc,
    syncRoot: path.join(extSrc, 'sync'),
    contentsRoot: path.join(extSrc, 'contents'),
    entriesPath,
    contentHelperEntry: path.join(extSrc, 'contents/helper.ts'),
    tsconfigPath: path.join(extRoot, 'tsconfig.json'),
    absWorkingDir: extRoot
  })
  const p = sha256Hex(normalizeBundle((await pkgHelper.buildContentHelperResult()).iife))
  const x = sha256Hex(normalizeBundle((await extHelper.buildContentHelperResult()).iife))
  if (p !== x) drifted.push('content-helper: compiled bundle drift')
} catch (err) {
  drifted.push(`content-helper: compile failed (${err instanceof Error ? err.message : err})`)
}

if (drifted.length) {
  console.error(`[injector-drift] ${drifted.length} file(s) drifted between extension and packages/injectors:`)
  for (const d of drifted) console.error(`  ${d}`)
  console.error('Sync the changed platform script across both trees (or update the other side).')
  process.exit(1)
}

console.log(`[injector-drift] OK — ${entries.length} scripts + helper match between extension and packages/injectors`)
