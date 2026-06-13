/**
 * Privacy redaction for Sentry payloads.
 *
 * WHY this is mandatory on desktop: unlike the web app, this Electron client
 * drives many third-party platform accounts — their session cookies, login
 * tokens, proxy passwords and page content all live in this process. A raw
 * Sentry event could otherwise carry any of that off-device. Every event,
 * transaction and breadcrumb is scrubbed in the MAIN process (the single choke
 * point @sentry/electron funnels renderer events through) before it leaves.
 *
 * This is a focused port of the web app's redaction primitives
 * (apps/web/src/lib/redaction-primitives.ts). It is intentionally generic and
 * Sentry-type-free so it stays trivially testable; sentry.ts supplies the types.
 */

const FILTERED = '[Filtered]'
const MAX_DEPTH = 6
const MAX_STRING_LENGTH = 2000

/**
 * Key names whose VALUE must always be dropped wholesale, regardless of content.
 * Matched case-insensitively against the object key (and a few hyphen/underscore
 * variants of the same concept).
 */
const SENSITIVE_KEY_PATTERN =
  /(authorization|cookie|set-cookie|x-auth|token|jwt|secret|password|passwd|pwd|phone|mobile|email|api[_-]?key|access[_-]?key|secret[_-]?key|private[_-]?key|client[_-]?secret|refresh[_-]?token|session|signature|credential|bearer|otp|verif(y|ication)[_-]?code|sms[_-]?code|oss[_-]?access)/i

/** The only event.user fields we keep. Everything else (email/ip/...) is dropped. */
const ALLOWED_USER_FIELDS = new Set(['id', 'username'])

/** Query-string keys whose value is redacted inside any URL-bearing string. */
const SENSITIVE_QUERY_KEY =
  /^(token|auth|authorization|password|pwd|secret|jwt|session|sig|signature|access_key|api_key|apikey|code|otp|refresh_token|client_secret)$/i

/** Embedded-secret scanners applied to free-text string values. */
const VALUE_SCANNERS: Array<{ re: RegExp; replace: string }> = [
  // Credentials embedded in a URL authority, e.g. a proxy http://user:pass@host
  { re: /([a-z][a-z0-9+.-]*:\/\/)[^:@/\s]+:[^@/\s]+@/gi, replace: `$1${FILTERED}@` },
  // JWTs (header.payload.signature)
  { re: /eyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{4,}/g, replace: FILTERED },
  // Authorization scheme + credential
  { re: /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{8,}/gi, replace: `$1 ${FILTERED}` },
  // Emails
  { re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, replace: FILTERED },
  // Mainland China mobile numbers
  { re: /\b1[3-9]\d{9}\b/g, replace: FILTERED }
]

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERN.test(key)
}

/** Redact sensitive query params inside any URL-looking substring of `value`. */
function redactUrlParams(value: string): string {
  return value.replace(/([?&])([^=&\s]+)=([^&\s#]*)/g, (match, sep, key, _val) =>
    SENSITIVE_QUERY_KEY.test(key) ? `${sep}${key}=${FILTERED}` : match
  )
}

function scanString(value: string): string {
  let out = value
  out = redactUrlParams(out)
  for (const { re, replace } of VALUE_SCANNERS) {
    out = out.replace(re, replace)
  }
  if (out.length > MAX_STRING_LENGTH) {
    out = `${out.slice(0, MAX_STRING_LENGTH)}…[truncated]`
  }
  return out
}

function sanitizeValue(value: unknown, depth: number): unknown {
  if (value == null) return value
  if (typeof value === 'string') return scanString(value)
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (depth >= MAX_DEPTH) return FILTERED

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, depth + 1))
  }
  if (typeof value === 'object') {
    return sanitizeObject(value as Record<string, unknown>, depth + 1)
  }
  // functions / symbols / bigint — never forward
  return FILTERED
}

function sanitizeObject(obj: Record<string, unknown>, depth: number): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(obj)) {
    if (isSensitiveKey(key)) {
      out[key] = FILTERED
      continue
    }
    out[key] = sanitizeValue(obj[key], depth)
  }
  return out
}

/** Drop everything from event.user except an allow-list (id, username). */
function sanitizeUser(user: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(user)) {
    if (!ALLOWED_USER_FIELDS.has(key)) continue
    const val = user[key]
    out[key] = typeof val === 'string' ? scanString(val) : val
  }
  return out
}

/**
 * Scrub a Sentry event/transaction in place-safe fashion (returns a new shape).
 * Generic so callers keep their concrete Sentry types without this module
 * importing them.
 */
export function sanitizeSentryEvent<T>(event: T): T {
  if (!event || typeof event !== 'object') return event
  const e = event as unknown as Record<string, unknown>

  // user: allow-list only
  if (e.user && typeof e.user === 'object') {
    e.user = sanitizeUser(e.user as Record<string, unknown>)
  }

  // request: drop body/cookies, scrub headers + query string via generic walk
  if (e.request && typeof e.request === 'object') {
    const req = e.request as Record<string, unknown>
    delete req.data
    delete req.cookies
    if (typeof req.query_string === 'string') req.query_string = scanString(req.query_string)
    if (req.headers && typeof req.headers === 'object') {
      req.headers = sanitizeObject(req.headers as Record<string, unknown>, 1)
    }
    if (typeof req.url === 'string') req.url = redactUrlParams(req.url)
  }

  // Generic recursive scrub over the noisy free-form containers. `threads` can
  // carry stack-frame locals; `logentry` carries formatted-message params;
  // `spans` only appears once tracing is enabled (phase 2) but is free to cover
  // now so it can never leak later.
  for (const field of [
    'extra',
    'contexts',
    'tags',
    'breadcrumbs',
    'threads',
    'logentry',
    'spans'
  ] as const) {
    if (e[field] && typeof e[field] === 'object') {
      e[field] = sanitizeValue(e[field], 1)
    }
  }

  // Exception/message values can embed tokens in their text.
  if (e.message && typeof e.message === 'object') {
    e.message = sanitizeValue(e.message, 1)
  } else if (typeof e.message === 'string') {
    e.message = scanString(e.message)
  }
  if (e.exception && typeof e.exception === 'object') {
    e.exception = sanitizeValue(e.exception, 1)
  }

  return event
}

/** Scrub a single breadcrumb (message + data). Returns null to drop it. */
export function sanitizeBreadcrumb<T>(breadcrumb: T): T {
  if (!breadcrumb || typeof breadcrumb !== 'object') return breadcrumb
  const b = breadcrumb as unknown as Record<string, unknown>
  if (typeof b.message === 'string') b.message = scanString(b.message)
  if (b.data && typeof b.data === 'object') {
    b.data = sanitizeObject(b.data as Record<string, unknown>, 1)
  }
  return breadcrumb
}
