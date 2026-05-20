import * as Sentry from '@sentry/nextjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { createSentryOptions } from './sentry.shared';

Sentry.init({
  ...createSentryOptions({ runtime: 'server' }),
  integrations: [nodeProfilingIntegration()],
  profilesSampleRate: 1.0,
});
