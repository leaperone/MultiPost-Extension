import { HeroUIProvider } from '@heroui/react';
import { ToastProvider as HeroToastProvider } from '@heroui/toast';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactNode } from 'react';

import { LocaleProvider } from '../i18n/locale-provider';
import type { Locales } from '../i18n/settings';
import { DeploymentErrorHandler } from './DeploymentErrorHandler';
import { PostHogAnalyticsProvider } from './posthog-analytics-provider';
import { SentryUserBinder } from './sentry-user-binder';
import { Toaster } from './ui/toaster';
import { Toaster as Sonner } from './ui/sonner';

export function Providers({
  children,
  locale,
}: {
  children: ReactNode;
  locale: Locales;
}) {
  return (
    <PostHogAnalyticsProvider>
      <SentryUserBinder />
      <HeroUIProvider>
        <HeroToastProvider placement="bottom-right" />
        <DeploymentErrorHandler />
        <LocaleProvider value={locale}>
          <NextThemesProvider
            attribute="class"
            defaultTheme="dark">
            {children}
            <Toaster />
            <Sonner />
          </NextThemesProvider>
        </LocaleProvider>
      </HeroUIProvider>
    </PostHogAnalyticsProvider>
  );
}
