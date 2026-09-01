import {
  buildDesktopContentHelperBundleResult,
  buildDesktopInjectorBundleResult,
  INJECTOR_GLOBAL_NAME
} from './injector-bundles.mjs'

const EXPECTED_INJECTOR_COUNT = 108

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

const helperResult = await buildDesktopContentHelperBundleResult({ log: true })
if (typeof helperResult.iife !== 'string' || helperResult.iife.length === 0) {
  fail('content-helper bundle did not build to a non-empty string')
} else {
  // 守住本特性依赖的关键不变量,防 bundle 在 extension 改动后悄悄丢失能力:
  // 必须含 createElement 劫持 + B 站图片消息监听,且不得残留 Plasmo 运行时依赖。
  if (!helperResult.iife.includes('BILIBILI_DYNAMIC_UPLOAD_IMAGES')) {
    fail('content-helper bundle missing BILIBILI_DYNAMIC_UPLOAD_IMAGES listener')
  }
  if (!helperResult.iife.includes('WEIBO_UPLOAD_VIDEO')) {
    fail('content-helper bundle missing WEIBO_UPLOAD_VIDEO listener')
  }
  if (!helperResult.iife.includes('createElement')) {
    fail('content-helper bundle missing document.createElement hook')
  }
  if (helperResult.iife.includes('@plasmohq') || helperResult.iife.includes('plasmohq/')) {
    fail('content-helper bundle unexpectedly retains a Plasmo runtime dependency')
  }
}

if (!process.exitCode) {
  console.log(`[verify:injectors] verified ${result.entries.length} desktop injector bundles`)
  console.log('[verify:injectors] verified desktop content-helper bundle')
}
