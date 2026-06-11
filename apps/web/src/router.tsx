import { QueryClient } from '@tanstack/react-query';
import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query';

import { SentryRouteErrorBoundary } from './components/SentryRouteErrorBoundary';
import { routeTree } from './routeTree.gen';

export function createRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Avoid refetch storms right after SSR hydration; data stays fresh for a minute.
        staleTime: 60 * 1000,
      },
    },
  });

  const router = createTanStackRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultErrorComponent: SentryRouteErrorBoundary,
  });

  setupRouterSsrQueryIntegration({ router, queryClient });

  return router;
}

export function getRouter() {
  return createRouter();
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}
