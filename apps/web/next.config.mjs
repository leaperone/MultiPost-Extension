import path from 'node:path';
import { config as dotenvConfig } from 'dotenv';

// Load .env files from monorepo root (Next.js only looks in the project dir by default)
const monorepoRoot = path.join(import.meta.dirname, '../../');
dotenvConfig({ path: path.join(monorepoRoot, '.env.local'), override: true });
dotenvConfig({ path: path.join(monorepoRoot, '.env') });

import { PrismaPlugin } from '@prisma/nextjs-monorepo-workaround-plugin';
import { withPostHogConfig } from '@posthog/nextjs-config';
import { withSentryConfig } from '@sentry/nextjs';
import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(import.meta.dirname, '../../'),
  productionBrowserSourceMaps: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'nextui.org' },
      { protocol: 'https', hostname: 'icons.duckduckgo.com' },
      { protocol: 'https', hostname: '2someone-web-static.s3.bitiful.net' },
      { protocol: 'https', hostname: 'filesystem.site' },
      { protocol: 'https', hostname: 'assets.seede.ai' },
      { protocol: 'https', hostname: 'static.seedeai.com' },
      // Douyin/TikTok CDN domains for video covers
      { protocol: 'https', hostname: '*.douyinpic.com' },
      { protocol: 'https', hostname: '*.byteimg.com' },
      { protocol: 'https', hostname: '*.tiktokcdn.com' },
      { protocol: 'https', hostname: 'p*.douyinpic.com' },
      { protocol: 'https', hostname: 'p*.byteimg.com' },
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.plugins = [...config.plugins, new PrismaPlugin()];
    }

    // Exclude backend directory from webpack processing
    config.module.rules.push({
      test: /\.(ts|tsx|js|jsx)$/,
      exclude: [/node_modules/, /backend/],
    });

    // Suppress fumadocs-mdx dynamic import warning (safe to ignore)
    config.infrastructureLogging = {
      ...config.infrastructureLogging,
      level: 'error',
    };

    return config;
  },
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: 'frame-src *.cloudflare.com seede.ai',
        },
        {
          key: 'X-Frame-Options',
          value: 'SAMEORIGIN',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
      ],
    },
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: '*' },
        { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS, PUT' },
        { key: 'Access-Control-Allow-Headers', value: '*' },
        { key: 'Access-Control-Max-Age', value: '86400' },
      ],
    },
  ],
};

const posthogOptions = {
  personalApiKey: process.env.POSTHOG_API_KEY,
  envId: process.env.POSTHOG_MULTIPOST_ENV_ID,
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  sourcemaps: {
    enabled: process.env.NODE_ENV === 'production' && !!process.env.POSTHOG_API_KEY,
    project: 'multipost',
    deleteAfterUpload: false,
  },
};

const sentryOptions = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT || 'multipost-web',
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sentryUrl: process.env.SENTRY_URL || 'https://sentry.leaper.one',
  silent: !process.env.CI,
  widenClientFileUpload: false,
  // CI 是 release 的唯一拥有者；构建时只需把 release 名注入到 bundle，不要在这里 new/finalize
  release: {
    name: process.env.SENTRY_RELEASE,
    create: false,
    finalize: false,
    setCommits: false,
  },
  sourcemaps: {
    disable: true,
    deleteSourcemapsAfterUpload: false,
  },
};

export default withSentryConfig(withPostHogConfig(withMDX(nextConfig), posthogOptions), sentryOptions);
