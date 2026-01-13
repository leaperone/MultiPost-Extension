import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { Providers } from './providers';
import { PostHogAnalyticsProvider } from './posthog-provider';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { GoogleAnalytics } from '@next/third-parties/google';
import { getLocale } from '@/i18n/server';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  metadataBase: new URL('https://multipost.app'),
  title: {
    default: 'MultiPost - 开源社交媒体一键分发工具 | 多平台内容发布神器',
    template: '%s | MultiPost',
  },
  description:
    '🚀 MultiPost 是一款开源浏览器插件,支持一键将内容分发到微博、小红书、Twitter、LinkedIn 等多个社交平台。提供智能内容提取、AI 辅助创作、平台优化等功能,让内容创作者轻松管理多平台账号。',
  keywords: [
    '社交媒体管理工具',
    '多平台发布',
    '内容分发',
    '一键发布',
    '开源工具',
    'MultiPost',
    '微博发布工具',
    '小红书发布',
    'Twitter 发布',
    '浏览器插件',
    'social media management',
    'multi-platform publishing',
    'content distribution',
  ],
  authors: [{ name: 'MultiPost Team', url: 'https://multipost.app' }],
  creator: 'MultiPost',
  publisher: 'MultiPost',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    alternateLocale: ['en_US', 'ja_JP'],
    url: 'https://multipost.app',
    siteName: 'MultiPost',
    title: 'MultiPost - 开源社交媒体一键分发工具',
    description: '🚀 一键将内容分发到微博、小红书、Twitter、LinkedIn 等多个社交平台,节省 80% 发布时间',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'MultiPost - 多平台内容发布工具',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MultiPost - 开源社交媒体一键分发工具',
    description: '🚀 一键将内容分发到多个社交平台,节省 80% 发布时间',
    images: ['/twitter-image.png'],
    creator: '@multipost_app',
  },
  alternates: {
    canonical: 'https://multipost.app',
    languages: {
      'zh-CN': 'https://multipost.app/zh',
      'en-US': 'https://multipost.app/en',
    },
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
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
      {process.env.NODE_ENV === 'production' && (
        <Script
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2175078350453165"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      )}
      {process.env.NODE_ENV === 'development' && (
        <Script
          src="//unpkg.com/react-grab/dist/index.global.js"
          crossOrigin="anonymous"
          strategy="beforeInteractive"
        />
      )}
    </html>
  );
}
