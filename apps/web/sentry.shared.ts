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
    beforeSend,
    beforeSendTransaction,
    beforeSendSpan,
    beforeBreadcrumb,
    initialScope: {
      tags: { app: 'multipost-web', runtime },
    },
  };
}
