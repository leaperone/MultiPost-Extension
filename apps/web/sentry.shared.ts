import { beforeBreadcrumb, beforeSend, beforeSendSpan, beforeSendTransaction } from './sentry.client-sanitizer';

function nonEmptyEnv(...values: Array<string | undefined>) {
  return values.find((v) => v && v.trim().length > 0) ?? '';
}

export const SENTRY_DSN = nonEmptyEnv(process.env.SENTRY_DSN, process.env.NEXT_PUBLIC_SENTRY_DSN);
export const SENTRY_PROJECT = 'multipost-web';

interface SentryRuntimeOptions {
  runtime: 'client' | 'server' | 'edge';
}

function getEnvironment() {
  // NEXT_PUBLIC_* is inlined into client bundles by Next.js; SENTRY_ENVIRONMENT only reaches server runtime if the final stage exports it.
  return (
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ??
    process.env.SENTRY_ENVIRONMENT ??
    process.env.NODE_ENV ??
    'development'
  );
}

function getTracesSampleRate() {
  return process.env.NODE_ENV === 'production' ? 0.05 : 1;
}

export function createSentryOptions({ runtime }: SentryRuntimeOptions) {
  return {
    dsn: SENTRY_DSN,
    enabled: Boolean(SENTRY_DSN),
    environment: getEnvironment(),
    // Do not set release here. @sentry/nextjs injects the build-time release first,
    // and release: undefined would overwrite that injected value.
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
