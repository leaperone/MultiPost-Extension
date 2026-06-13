import * as Sentry from '@sentry/electron/renderer'

let initialized = false

/**
 * Initialize Sentry in a renderer we own (main UI + toast overlay only — never
 * the embedded web-dashboard or third-party platform views).
 *
 * Config (DSN, environment, release) and — crucially — the privacy scrubbing
 * are inherited from the main process: @sentry/electron forwards renderer
 * events over IPC to main, where the single beforeSend strips sensitive data.
 * So this stays deliberately minimal; the toggle/opt-out is enforced in main.
 */
export function initSentryRenderer(): void {
  if (initialized) return
  initialized = true
  Sentry.init({})
}
