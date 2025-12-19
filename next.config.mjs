import { PrismaPlugin } from '@prisma/nextjs-monorepo-workaround-plugin';
import { withPostHogConfig } from '@posthog/nextjs-config';

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

export default withPostHogConfig(nextConfig, {
  personalApiKey: process.env.POSTHOG_API_KEY,
  envId: process.env.POSTHOG_MULTIPOST_ENV_ID,
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  sourcemaps: {
    enabled: true,
    project: 'multipost',
    deleteAfterUpload: true,
  },
});
