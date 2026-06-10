import * as Sentry from '@sentry/react';

import { createSentryOptions } from './sentry.shared';

let hasInitialized = false;

export function initSentryClient(router?: unknown) {
  if (hasInitialized || typeof window === 'undefined') {
    return;
  }

  const tracingIntegration =
    router && 'tanstackRouterBrowserTracingIntegration' in Sentry
      ? Sentry.tanstackRouterBrowserTracingIntegration(router)
      : Sentry.browserTracingIntegration();

  Sentry.init({
    ...createSentryOptions({ runtime: 'client' }),
    integrations: [tracingIntegration],
  });

  hasInitialized = true;
}
