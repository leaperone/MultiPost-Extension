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
    // issue #258: silence Prisma "can't reach database" — transient infrastructure,
    // not application bugs. Caught at the data-access layer where possible; this is the safety net.
    ignoreErrors: [
      /^Extension request timeout: action=MUTLIPOST_EXTENSION_(CHECK_SERVICE_STATUS|PLATFORMS|REQUEST_TRUST_DOMAIN) timeout=\d+ms$/,
      /Can't reach database server at/,
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
