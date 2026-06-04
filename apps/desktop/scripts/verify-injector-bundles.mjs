import { buildDesktopInjectorBundleResult, INJECTOR_GLOBAL_NAME } from './injector-bundles.mjs'

const EXPECTED_INJECTOR_COUNT = 70

function fail(message) {
  console.error(`[verify:injectors] ${message}`)
  process.exitCode = 1
}

const result = await buildDesktopInjectorBundleResult({ log: true })

if (result.entries.length !== EXPECTED_INJECTOR_COUNT) {
  fail(`expected ${EXPECTED_INJECTOR_COUNT} injector bundle entries, found ${result.entries.length}`)
}

for (const entry of result.entries) {
  const iife = result.bundles[entry.extensionKey]
  if (!iife) {
    fail(`missing bundle for ${entry.extensionKey}`)
    continue
  }

  try {
    const exposed = new Function(`${iife}\nreturn ${INJECTOR_GLOBAL_NAME};`)()
    if (!exposed || typeof exposed.injector !== 'function') {
      fail(`${entry.extensionKey} did not expose an injector function`)
    }
  } catch (error) {
    fail(`${entry.extensionKey} bundle does not parse/expose cleanly: ${error instanceof Error ? error.message : error}`)
  }
}

if (!process.exitCode) {
  console.log(`[verify:injectors] verified ${result.entries.length} desktop injector bundles`)
}
