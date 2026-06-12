// Baseline tool for the injector hot-update migration (Batch 0A/0B/0C).
// Records a sha256 per desktop injector bundle + the content-helper bundle so
// later batches can prove they did not change injection output. Reuses the exact
// esbuild path that ships in dev.
//
// Usage:
//   node scripts/hash-injector-bundles.mjs                       # print snapshot JSON to stdout
//   node scripts/hash-injector-bundles.mjs --out base.json       # write baseline snapshot
//   node scripts/hash-injector-bundles.mjs --check base.json     # compare to baseline (exit 1 on drift)
//   ... add --normalize to any of the above to hash path-normalized output
//
// --normalize: esbuild prefixes each bundled module with a `// <path>` comment
// relative to absWorkingDir. Moving sources (extension -> packages/injectors)
// changes that path but not the code. Normalizing the path comment to its
// basename lets Batch 0C prove behavior-equivalence even though raw bytes shift.
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { normalizeBundle } from '@multipost/injectors/build'
import { buildDesktopContentHelperBundleResult, buildDesktopInjectorBundleResult } from './injector-bundles.mjs'

const NORMALIZE = process.argv.includes('--normalize')

function sha256(text) {
  return createHash('sha256').update(NORMALIZE ? normalizeBundle(text) : text, 'utf8').digest('hex')
}

function argValue(flag) {
  const idx = process.argv.indexOf(flag)
  return idx >= 0 ? process.argv[idx + 1] : null
}

async function computeSnapshot() {
  const result = await buildDesktopInjectorBundleResult({ log: false })
  const helperResult = await buildDesktopContentHelperBundleResult({ log: false })

  const bundles = {}
  for (const entry of result.entries) {
    const iife = result.bundles[entry.extensionKey]
    if (!iife) {
      console.error(`[hash:injectors] missing bundle for ${entry.extensionKey}`)
      process.exitCode = 1
      continue
    }
    bundles[entry.extensionKey] = sha256(iife)
  }

  // Stable key order so the snapshot JSON diffs cleanly across runs.
  const sortedBundles = Object.fromEntries(Object.keys(bundles).sort().map((key) => [key, bundles[key]]))

  return {
    normalized: NORMALIZE,
    injectorCount: result.entries.length,
    bundles: sortedBundles,
    helper: sha256(helperResult.iife)
  }
}

function diffSnapshots(baseline, current) {
  const diffs = []
  if (!!baseline.normalized !== !!current.normalized) {
    diffs.push(`normalize mode differs: baseline ${!!baseline.normalized} vs now ${!!current.normalized}`)
  }
  if (baseline.injectorCount !== current.injectorCount) {
    diffs.push(`injector count: baseline ${baseline.injectorCount} -> now ${current.injectorCount}`)
  }
  if (baseline.helper !== current.helper) {
    diffs.push(`helper sha: ${String(baseline.helper).slice(0, 12)} -> ${current.helper.slice(0, 12)}`)
  }
  const keys = new Set([...Object.keys(baseline.bundles ?? {}), ...Object.keys(current.bundles)])
  for (const key of [...keys].sort()) {
    const a = baseline.bundles?.[key]
    const b = current.bundles[key]
    if (a === b) continue
    if (!a) diffs.push(`+ ${key} (new)`)
    else if (!b) diffs.push(`- ${key} (gone)`)
    else diffs.push(`~ ${key}: ${a.slice(0, 12)} -> ${b.slice(0, 12)}`)
  }
  return diffs
}

const snapshot = await computeSnapshot()
const json = `${JSON.stringify(snapshot, null, 2)}\n`

const checkPath = argValue('--check')
const outPath = argValue('--out')

if (checkPath) {
  const baseline = JSON.parse(await readFile(checkPath, 'utf8'))
  const diffs = diffSnapshots(baseline, snapshot)
  if (diffs.length) {
    console.error(`[hash:injectors] MISMATCH vs ${checkPath} (${diffs.length} change(s)):`)
    for (const d of diffs) console.error(`  ${d}`)
    process.exitCode = 1
  } else {
    const mode = snapshot.normalized ? ' normalized' : ''
    console.log(`[hash:injectors] OK - ${snapshot.injectorCount} bundles + helper match${mode} ${checkPath}`)
  }
} else if (outPath) {
  await writeFile(outPath, json, 'utf8')
  console.log(`[hash:injectors] wrote${snapshot.normalized ? ' normalized' : ''} baseline (${snapshot.injectorCount} bundles + helper) -> ${outPath}`)
} else {
  process.stdout.write(json)
}
