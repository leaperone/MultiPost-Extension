import {
  browserTracingIntegration,
  init,
  tanstackRouterBrowserTracingIntegration,
} from '@sentry/react';

import { createSentryOptions } from './sentry.shared';

let hasInitialized = false;

export function initSentryClient(router?: unknown) {
  if (hasInitialized || typeof window === 'undefined') {
    return;
  }

  // Named imports keep @sentry/react tree-shakeable; a namespace import with an
  // `in` check used to drag the replay/feedback integrations into the bundle.
  const tracingIntegration = router
    ? tanstackRouterBrowserTracingIntegration(
        router as Parameters<typeof tanstackRouterBrowserTracingIntegration>[0],
      )
    : browserTracingIntegration();

  init({
    ...createSentryOptions({ runtime: 'client' }),
    integrations: [tracingIntegration],
  });

  hasInitialized = true;
}
