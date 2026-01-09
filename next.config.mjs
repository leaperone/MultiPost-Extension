import { PrismaPlugin } from '@prisma/nextjs-monorepo-workaround-plugin';
import { withPostHogConfig } from '@posthog/nextjs-config';
import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'nextui.org' },
      { protocol: 'https', hostname: 'icons.duckduckgo.com' },
      { protocol: 'https', hostname: '2someone-web-static.s3.bitiful.net' },
      { protocol: 'https', hostname: 'filesystem.site' },
      { protocol: 'https', hostname: 'assets.seede.ai' },
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

const configWithPostHog = withPostHogConfig(nextConfig, {
  personalApiKey: process.env.POSTHOG_API_KEY,
  envId: process.env.POSTHOG_MULTIPOST_ENV_ID,
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  sourcemaps: {
    enabled: process.env.NODE_ENV === 'production' && !!process.env.POSTHOG_API_KEY,
    project: 'multipost',
    deleteAfterUpload: true,
  },
});

// Ensure standalone output is preserved after plugin wrappers
const finalConfig = withMDX({
  ...configWithPostHog,
  output: 'standalone',
});

// Remove turbopack field to fix Next.js 15.2.x warning
delete finalConfig.turbopack;

export default finalConfig;
