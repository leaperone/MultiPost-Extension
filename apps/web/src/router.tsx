import { createRouter as createTanStackRouter } from '@tanstack/react-router';

import { SentryRouteErrorBoundary } from './components/SentryRouteErrorBoundary';
import { routeTree } from './routeTree.gen';

export function createRouter() {
  return createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultErrorComponent: SentryRouteErrorBoundary,
  });
}

export function getRouter() {
  return createRouter();
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}
