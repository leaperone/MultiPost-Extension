import { HeroUIProvider } from '@heroui/react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { SessionProvider } from 'next-auth/react';
import { auth } from '@/auth';
import { getLocale } from '@/i18n/server';
import { LocaleProvider } from '@/i18n/locale-provider';
import { Locales } from '@/i18n/settings';
import { ToastProvider } from '@heroui/toast';
import { DeploymentErrorHandler } from '@/components/DeploymentErrorHandler';
import { isDesktopRequest } from '@/lib/desktop-detect';
import { SentryUserBinder } from './sentry-user-provider';

export async function Providers({ children }: { children: React.ReactNode }) {
  const isDesktop = await isDesktopRequest();
  const session = isDesktop ? null : await auth();
  const locale = await getLocale();
  return (
    <SessionProvider session={session}>
      <SentryUserBinder />
      <HeroUIProvider>
        <ToastProvider placement="bottom-right" />
        <DeploymentErrorHandler />
        <LocaleProvider value={locale as Locales}>
          <NextThemesProvider
            attribute="class"
            defaultTheme="dark">
            {children}
          </NextThemesProvider>
        </LocaleProvider>
      </HeroUIProvider>
    </SessionProvider>
  );
}
