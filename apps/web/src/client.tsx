import { StrictMode, startTransition } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { Await, RouterProvider } from '@tanstack/react-router';
import { hydrateStart } from '@tanstack/react-start/client';

import { ensureLocaleResources } from './i18n/client';
import { FALLBACK_LOCALE, supportedLocales, type Locales } from './i18n/settings';

// A failed dynamic-import preload almost always means this tab predates the
// latest deploy and is requesting hashed chunks that no longer exist. Reload
// to pick up the new build instead of surfacing an error boundary. The
// timestamp guard prevents reload loops if the failure persists.
window.addEventListener('vite:preloadError', (event) => {
  const RELOAD_GUARD_KEY = 'chunk-reload-at';
  const lastReloadAt = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) ?? 0);
  if (Date.now() - lastReloadAt < 30_000) return;
  sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
  event.preventDefault();
  window.location.reload();
});

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
