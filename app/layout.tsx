import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { PostHogAnalyticsProvider } from './posthog-provider';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { GoogleAnalytics } from '@next/third-parties/google';
import { getLocale } from '@/i18n/server';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'MultiPost - Open Source Social Media Publishing Tool',
  description:
    'MultiPost is an open source browser extension that helps you publish content to multiple social media platforms with one click. Save time and boost your social media presence.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      className="dark"
      style={{ colorScheme: 'dark' }}>
      <body className={inter.className}>
        <PostHogAnalyticsProvider>
          <Providers>
            {children}
            <Toaster />
            <Sonner />
          </Providers>
        </PostHogAnalyticsProvider>
      </body>
      {process.env.NODE_ENV === 'production' && <GoogleAnalytics gaId={'G-6JJ7JNT2GY'} />}
    </html>
  );
}
