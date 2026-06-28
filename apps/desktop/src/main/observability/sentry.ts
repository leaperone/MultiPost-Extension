import { app } from 'electron'
import * as Sentry from '@sentry/electron/main'
import { getTelemetryEnabled } from '../appSettings'
import { sanitizeSentryEvent, sanitizeBreadcrumb } from './redaction'

/**
 * Public DSN for the multipost-desktop Sentry project. A DSN is not a secret —
 * it is meant to be embedded in the client — so a hardcoded fallback keeps
 * crash reporting working even when SENTRY_DSN_DESKTOP isn't injected at build
 * time. Empty DSN ⇒ Sentry simply never initializes (graceful degrade).
 */
const FALLBACK_DSN = 'https://1ae6d7d1c91e44a9b32b2bd31a2b1b81@sentry.leaperone.cn/12'

let initialized = false

/**
 * Runtime mirror of the telemetry opt-out toggle. Cached (instead of reading
 * app-settings.json on every breadcrumb) and kept fresh by the IPC setter via
 * setSentryTelemetryEnabled — so flipping the switch takes effect instantly,
 * with no per-event disk read and no restart.
 */
let telemetryEnabled = true

export function setSentryTelemetryEnabled(enabled: boolean): void {
  telemetryEnabled = enabled
}

/**
 * Initialize Sentry in the main process. Must be called as early as possible
 * (before app.whenReady) so startup crashes are captured. @sentry/electron
 * funnels every renderer event through this process, so the beforeSend scrub
 * below is the single place sensitive data is stripped.
 */
export function initSentryMain(): void {
  if (initialized) return

  const dsn = process.env.SENTRY_DSN_DESKTOP || FALLBACK_DSN
  if (!dsn) return

  telemetryEnabled = getTelemetryEnabled()
  initialized = true

  Sentry.init({
    dsn,
    environment: app.isPackaged ? 'production' : 'development',
    release: `multipost-desktop@${app.getVersion()}`,
    // Phase 1 is errors + native crashes only; no performance tracing yet.
    tracesSampleRate: 0,
    // Never auto-attach PII; the scrubbers below are the safety net, this is
    // the first line of defense.
    sendDefaultPii: false,
    // Chromium network errors surfaced by webContents.loadURL (BROWSER_OPEN,
    // platform navigations) are user-environment issues — the user's network
    // dropped, a proxy died, the user cancelled mid-load — not application
    // bugs. ERR_ABORTED is also the normal outcome of stopLoading()/quick
    // re-navigation. The browserViewManager already classifies and downgrades
    // these to info/warn logs; this drops the duplicate Sentry events that
    // still leak through (IPC reject path, renderer-side window.api callers
    // re-raising, etc.) so the inbox stays focused on real bugs.
    ignoreErrors: [
      /\bERR_(ABORTED|FAILED|CONNECTION_(TIMED_OUT|CLOSED|REFUSED|RESET)|INTERNET_DISCONNECTED|NAME_NOT_RESOLVED|ADDRESS_UNREACHABLE|NETWORK_CHANGED|PROXY_CONNECTION_FAILED|TUNNEL_CONNECTION_FAILED|TIMED_OUT|SSL_PROTOCOL_ERROR|CERT_(AUTHORITY_INVALID|COMMON_NAME_INVALID|DATE_INVALID))\b/
    ],
    // Drop the Console integration: main-process console output captures
    // third-party platform debug info (and our own verbose logs) that must not
    // become breadcrumbs — even redacted, breadcrumb volume leaks usage.
    integrations: (defaults) => defaults.filter((integration) => integration.name !== 'Console'),
    beforeBreadcrumb(breadcrumb) {
      if (!telemetryEnabled) return null
      return sanitizeBreadcrumb(breadcrumb)
    },
    beforeSend(event, hint) {
      if (!telemetryEnabled) return null
      // Native-crash minidumps ride along as binary attachments (a raw process
      // heap snapshot that can hold third-party cookies, tokens and proxy
      // passwords). beforeSend cannot scrub binary attachments, so drop them
      // outright — the event still records that a native crash happened, just
      // without the heap dump.
      if (hint && Array.isArray(hint.attachments)) {
        hint.attachments = []
      }
      return sanitizeSentryEvent(event)
    },
    beforeSendTransaction(event) {
      if (!telemetryEnabled) return null
      return sanitizeSentryEvent(event)
    }
  })
}
