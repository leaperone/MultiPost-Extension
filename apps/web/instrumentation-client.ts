import * as Sentry from '@sentry/nextjs';
import { createSentryOptions } from './sentry.shared';

Sentry.init(createSentryOptions({ runtime: 'client' }));

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
