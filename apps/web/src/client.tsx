import { StrictMode, startTransition } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { Await, RouterProvider } from '@tanstack/react-router';
import { hydrateStart } from '@tanstack/react-start/client';

import { initSentryClient } from './sentry.client.config';

const routerPromise = hydrateStart().then((router) => {
  initSentryClient(router);
  return router;
});

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <Await promise={routerPromise}>
        {(router) => <RouterProvider router={router} />}
      </Await>
    </StrictMode>,
  );
});
