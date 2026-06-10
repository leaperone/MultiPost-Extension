import { createServerFn } from '@tanstack/react-start';
import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router';

import fumadocsCss from 'fumadocs-ui/style.css?url';
import interCss from '@fontsource/inter/latin.css?url';
import globalsCss from '../styles/globals.css?url';
import { SentryRouteErrorBoundary } from '../components/SentryRouteErrorBoundary';
import { Providers } from '../components/providers';
import { getLocale } from '../i18n/server';
import { FALLBACK_LOCALE } from '../i18n/settings';
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  ROOT_KEYWORDS,
  SITE_URL,
  organizationSchema,
  websiteSchema,
} from '../lib/seo';

const loadLocale = createServerFn({ method: 'GET' }).handler(async () => ({
  locale: await getLocale(),
}));

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

export const Route = createRootRoute({
  loader: () => loadLocale(),
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: DEFAULT_TITLE },
      { name: 'description', content: DEFAULT_DESCRIPTION },
      { name: 'keywords', content: ROOT_KEYWORDS.join(', ') },
      { name: 'author', content: 'MultiPost Team' },
      { name: 'creator', content: 'MultiPost' },
      { name: 'publisher', content: 'MultiPost' },
      { name: 'format-detection', content: 'email=no, address=no, telephone=no' },
      { property: 'og:type', content: 'website' },
      { property: 'og:locale', content: 'zh_CN' },
      { property: 'og:locale:alternate', content: 'en_US' },
      { property: 'og:locale:alternate', content: 'ja_JP' },
      { property: 'og:url', content: SITE_URL },
      { property: 'og:site_name', content: 'MultiPost' },
      { property: 'og:title', content: 'MultiPost - 开源社交媒体一键分发工具' },
      {
        property: 'og:description',
        content: '🚀 一键将内容分发到微博、小红书、Twitter、LinkedIn 等多个社交平台,节省 80% 发布时间',
      },
      { property: 'og:image', content: `${SITE_URL}/og-image.png` },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'og:image:alt', content: 'MultiPost - 多平台内容发布工具' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: 'MultiPost - 开源社交媒体一键分发工具' },
      { name: 'twitter:description', content: '🚀 一键将内容分发到多个社交平台,节省 80% 发布时间' },
      { name: 'twitter:image', content: `${SITE_URL}/twitter-image.png` },
      { name: 'twitter:creator', content: '@multipost_app' },
      {
        name: 'robots',
        content:
          'index, follow, max-video-preview:-1, max-image-preview:large, max-snippet:-1',
      },
      { name: 'google-adsense-account', content: 'ca-pub-2175078350453165' },
      { 'script:ld+json': organizationSchema },
      { 'script:ld+json': websiteSchema },
    ],
    links: [
      { rel: 'canonical', href: SITE_URL },
      { rel: 'alternate', hrefLang: 'zh-CN', href: `${SITE_URL}/zh` },
      { rel: 'alternate', hrefLang: 'en-US', href: `${SITE_URL}/en` },
      { rel: 'icon', href: '/favicon.ico' },
      { rel: 'icon', href: '/icon.png', type: 'image/png', sizes: '32x32' },
      { rel: 'apple-touch-icon', href: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
      { rel: 'stylesheet', href: fumadocsCss },
      { rel: 'stylesheet', href: interCss },
      { rel: 'stylesheet', href: globalsCss },
    ],
    headScripts: [
      ...(isProduction
        ? [
            {
              async: true,
              src: 'https://www.googletagmanager.com/gtag/js?id=G-6JJ7JNT2GY',
            },
            {
              children:
                "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-6JJ7JNT2GY');",
            },
            {
              async: true,
              src: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2175078350453165',
              crossOrigin: 'anonymous',
            },
          ]
        : []),
      ...(isDevelopment
        ? [
            {
              src: '//unpkg.com/react-grab/dist/index.global.js',
              crossOrigin: 'anonymous',
            },
          ]
        : []),
    ],
  }),
  errorComponent: RootErrorDocument,
  component: RootDocument,
});

function RootDocument() {
  const { locale } = Route.useLoaderData();

  return (
    <html
      lang={locale}
      className="dark"
      style={{ colorScheme: 'dark' }}>
      <head>
        <HeadContent />
      </head>
      <body
        className="bg-background text-foreground antialiased"
        style={{
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}>
        <Providers locale={locale}>
          <Outlet />
        </Providers>
        <Scripts />
      </body>
    </html>
  );
}

function RootErrorDocument(props: React.ComponentProps<typeof SentryRouteErrorBoundary>) {
  return (
    <html
      lang={FALLBACK_LOCALE}
      className="dark"
      style={{ colorScheme: 'dark' }}>
      <head>
        <HeadContent />
      </head>
      <body
        className="bg-background text-foreground antialiased"
        style={{
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}>
        <SentryRouteErrorBoundary {...props} />
        <Scripts />
      </body>
    </html>
  );
}
