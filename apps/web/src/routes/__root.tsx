import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router';

import globalsCss from '../styles/globals.css?url';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'MultiPost' },
    ],
    links: [{ rel: 'stylesheet', href: globalsCss }],
  }),
  component: RootDocument,
});

function RootDocument() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {/* Later phases mount HeroUIProvider, ToastProvider, theme, LocaleProvider, session, PostHog, and Sentry here. */}
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
