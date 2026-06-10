import { StrictMode, startTransition } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { Await, RouterProvider } from '@tanstack/react-router';
import { hydrateStart } from '@tanstack/react-start/client';

import { ensureLocaleResources } from './i18n/client';
import { FALLBACK_LOCALE, supportedLocales, type Locales } from './i18n/settings';

function detectDocumentLocale(): Locales {
  const lang = document.documentElement.lang;
  return (supportedLocales as readonly string[]).includes(lang) ? (lang as Locales) : FALLBACK_LOCALE;
}

// The active locale bundle must be in place before hydration so the client
// renders the same strings the server did. Failure falls through to raw keys
// instead of blocking hydration entirely.
const i18nReady = ensureLocaleResources(detectDocumentLocale()).catch((error) => {
  console.error('Failed to preload locale resources', error);
});

// Fetch the Sentry chunk in parallel with hydration so the init gap stays
// negligible without putting Sentry back into the entry chunk.
const sentryModulePromise = import('./sentry.client.config');

const routerPromise = Promise.all([hydrateStart(), i18nReady]).then(([router]) => {
  void sentryModulePromise.then(({ initSentryClient }) => initSentryClient(router));
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
