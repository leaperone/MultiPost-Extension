/**
 * Renderer logging that actually survives the session: console output stays
 * for DevTools, and a serialized copy travels over the preload bridge into
 * userData/logs/renderer.log so field issues are diagnosable after the fact.
 *
 * error/warn always cross the bridge; info/debug only when the user enabled
 * debug logging — IPC-per-log-line is too slow to leave on unconditionally.
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug'

const MAX_ARG_LENGTH = 8192

let debugEnabled = false

void window.api?.debugLog
  ?.get()
  .then((enabled) => {
    debugEnabled = enabled
  })
  .catch(() => undefined)

/** Keep the cached toggle in sync when the settings page flips it. */
export function setDebugLogEnabled(enabled: boolean): void {
  debugEnabled = enabled
}

function serializeArg(arg: unknown): string {
  if (typeof arg === 'string') return arg.slice(0, MAX_ARG_LENGTH)
  if (arg instanceof Error) {
    return `${arg.name}: ${arg.message}${arg.stack ? `\n${arg.stack}` : ''}`.slice(0, MAX_ARG_LENGTH)
  }
  try {
    return (JSON.stringify(arg) ?? String(arg)).slice(0, MAX_ARG_LENGTH)
  } catch {
    return String(arg).slice(0, MAX_ARG_LENGTH)
  }
}

function sendToMain(level: LogLevel, args: unknown[]): void {
  if ((level === 'info' || level === 'debug') && !debugEnabled) return
  try {
    window.api?.debugLog?.send(level, args.map(serializeArg))
  } catch {
    // Logging must never take the app down with it
  }
}

export const logger = {
  error: (...args: unknown[]): void => {
    console.error(...args)
    sendToMain('error', args)
  },
  warn: (...args: unknown[]): void => {
    console.warn(...args)
    sendToMain('warn', args)
  },
  info: (...args: unknown[]): void => {
    console.info(...args)
    sendToMain('info', args)
  },
  debug: (...args: unknown[]): void => {
    console.debug(...args)
    sendToMain('debug', args)
  }
}

/**
 * Capture what nobody writes a try/catch for: the ~60 existing console.error
 * call sites (patched wholesale instead of migrating each one) plus uncaught
 * exceptions and unhandled rejections.
 */
export function initRendererLogging(): void {
  const originalError = console.error.bind(console)
  console.error = (...args: unknown[]): void => {
    originalError(...args)
    sendToMain('error', args)
  }
  const originalWarn = console.warn.bind(console)
  console.warn = (...args: unknown[]): void => {
    originalWarn(...args)
    sendToMain('warn', args)
  }

  window.addEventListener('error', (event) => {
    sendToMain('error', ['Uncaught error:', event.error ?? event.message])
  })
  window.addEventListener('unhandledrejection', (event) => {
    sendToMain('error', ['Unhandled rejection:', event.reason])
  })
}
