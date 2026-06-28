import { beforeBreadcrumb, beforeSend, beforeSendSpan, beforeSendTransaction } from './sentry.client-sanitizer';

function nonEmptyEnv(...values: Array<string | undefined>) {
  return values.find((v) => v && v.trim().length > 0) ?? '';
}

function readEnv(name: string) {
  const viteEnv = (import.meta as ImportMeta & {
    env?: Record<string, string | boolean | undefined>;
  }).env;
  const viteValue = viteEnv?.[name];
  if (typeof viteValue === 'string') {
    return viteValue;
  }

  return typeof process !== 'undefined' ? process.env[name] : undefined;
}

function isProduction() {
  const viteEnv = (import.meta as ImportMeta & {
    env?: { PROD?: boolean; MODE?: string };
  }).env;

  if (typeof viteEnv?.PROD === 'boolean') {
    return viteEnv.PROD;
  }

  return readEnv('NODE_ENV') === 'production';
}

export const SENTRY_DSN = nonEmptyEnv(readEnv('SENTRY_DSN'), readEnv('NEXT_PUBLIC_SENTRY_DSN'));
export const SENTRY_PROJECT = 'multipost-web';

interface SentryRuntimeOptions {
  runtime: 'client' | 'server' | 'edge';
}

function getEnvironment() {
  return (
    readEnv('NEXT_PUBLIC_SENTRY_ENVIRONMENT') ??
    readEnv('SENTRY_ENVIRONMENT') ??
    readEnv('MODE') ??
    readEnv('NODE_ENV') ??
    'development'
  );
}

function getTracesSampleRate() {
  return isProduction() ? 0.05 : 1;
}

export function createSentryOptions({ runtime }: SentryRuntimeOptions) {
  return {
    dsn: SENTRY_DSN,
    enabled: Boolean(SENTRY_DSN),
    environment: getEnvironment(),
    // Leave release unset until build/deploy wiring injects it.
    tracesSampleRate: getTracesSampleRate(),
    sendDefaultPii: false,
    // issue #259: silence only extension-*probe* timeouts (env check). User-initiated
    // actions (PUBLISH, LINK_EXTENSION, OPEN_OPTIONS) keep reporting so real failures stay visible.
    // issue #258: silence transient database connectivity failures. Caught at the
    // data-access layer where possible; this is the safety net.
    // Stale-deploy + extension DOM + Electron IPC noise: DeploymentErrorHandler
    // already auto-reloads stale clients on chunk/import failures; extension DOM
    // races (Google Translate, Grammarly) reparent text nodes mid-commit so
    // React's insertBefore/removeChild hits a node it no longer owns; Electron
    // IPC errors carrying chromium ERR_* are the user's local network failing
    // to load a platform site (BROWSER_OPEN from the desktop renderer). None
    // of these are application bugs.
    ignoreErrors: [
      /^Extension request timeout: action=MUTLIPOST_EXTENSION_(CHECK_SERVICE_STATUS|PLATFORMS|REQUEST_TRUST_DOMAIN) timeout=\d+ms$/,
      /Can't reach database server at/,
      /connect ECONNREFUSED/i,
      /getaddrinfo ENOTFOUND/i,
      /connect ETIMEDOUT/i,
      /read ECONNRESET/i,
      /Connection terminated unexpectedly/i,
      /server closed the connection unexpectedly/i,
      /terminating connection due to administrator command/i,
      /database system is (shutting down|starting up|in recovery mode)/i,
      /\b(08000|08001|08003|08004|08006|08007|08P01|57P0[1-3])\b/,
      /ChunkLoadError/,
      /Loading chunk \d+ failed/i,
      /Loading CSS chunk \d+ failed/i,
      /Failed to fetch dynamically imported module/i,
      /Importing a module script failed/i,
      /does not provide an export named/,
      /Failed to execute 'insertBefore' on 'Node'/,
      /Failed to execute 'removeChild' on 'Node'/,
      /The node (?:before which the new node is to be inserted|to be removed) is not a child of this node/,
      /Error invoking remote method '[^']+': Error: ERR_/,
    ],
    beforeSend,
    beforeSendTransaction,
    beforeSendSpan,
    beforeBreadcrumb,
    initialScope: {
      tags: { app: 'multipost-web', runtime },
    },
  };
}
