import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

import { createSentryOptions } from './sentry.shared';

let hasInitialized = false;

export function initSentryServer() {
  if (hasInitialized) {
    return;
  }

  Sentry.init({
    ...createSentryOptions({ runtime: 'server' }),
    integrations: [nodeProfilingIntegration()],
    profilesSampleRate: 1.0,
  });

  hasInitialized = true;
}
