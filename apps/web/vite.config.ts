import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import tailwindcss from '@tailwindcss/vite';
import viteReact from '@vitejs/plugin-react';
import { config as dotenvConfig } from 'dotenv';
import fumadocsMdx from 'fumadocs-mdx/vite';
import { defineConfig } from 'vite';
import tsConfigPaths from 'vite-tsconfig-paths';
import {
  getBlogPrerenderPaths,
  getDocsPrerenderPaths,
} from './src/lib/content-prerender-paths';
import * as sourceConfig from './source.config';

const webRoot = fileURLToPath(new URL('.', import.meta.url));
const monorepoRoot = path.resolve(webRoot, '../..');
const prismaRoot = path.join(monorepoRoot, 'prisma');
const generatedPrismaClient = path.join(prismaRoot, 'client_multipost');
const fumadocsSourceDir = path.join(webRoot, '.source');

// Load monorepo root env files the same way next.config.mjs did.
dotenvConfig({ path: path.join(monorepoRoot, '.env.local'), override: true });
dotenvConfig({ path: path.join(monorepoRoot, '.env') });

// TanStack Start prerender starts the production server during build. The auth
// client validates a public origin at import time, so provide the production
// origin for static docs/blog rendering when CI does not inject one.
process.env.APP_URL ??= 'https://multipost.app';

const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;
const sentryOrg = process.env.SENTRY_ORG;
const sentryProject = process.env.SENTRY_PROJECT;
const sentryRelease = process.env.SENTRY_RELEASE;

const sentrySourceMapsEnabled = Boolean(
  sentryAuthToken && sentryOrg && sentryProject && sentryRelease,
);

const docsAndBlogPrerenderPages = Array.from(
  new Set([...getDocsPrerenderPaths(), ...getBlogPrerenderPaths()]),
).map((pagePath) => ({
  path: pagePath,
  prerender: {
    enabled: true,
    crawlLinks: false,
  },
}));

function createSentryPlugins() {
  if (!sentrySourceMapsEnabled) return [];

  return sentryVitePlugin({
    authToken: sentryAuthToken,
    org: sentryOrg,
    project: sentryProject,
    url: process.env.SENTRY_URL,
    telemetry: false,
    release: {
      name: sentryRelease,
      inject: true,
      create: true,
      finalize: true,
      setCommits: false,
    },
    sourcemaps: {
      assets: ['./dist/**/*.{js,mjs,js.map,mjs.map}'],
    },
  });
}

export default defineConfig(async () => ({
  server: {
    port: 3000,
  },
  build: {
    sourcemap: true,
  },
  // Expose existing NEXT_PUBLIC_* client env vars (alongside Vite's VITE_*) so
  // migrated client code reading import.meta.env.NEXT_PUBLIC_* keeps working
  // without renaming every key during the Next.js -> TanStack Start migration.
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  plugins: [
    await fumadocsMdx(sourceConfig, {
      index: {
        target: 'vite',
      },
    }),
    tanstackStart({
      pages: docsAndBlogPrerenderPages,
      prerender: {
        enabled: true,
        autoStaticPathsDiscovery: false,
        crawlLinks: false,
        failOnError: false,
      },
    }),
    viteReact(),
    tailwindcss(),
    tsConfigPaths({ projects: [path.join(webRoot, 'tsconfig.json')] }),
    // PostHog does not provide a clean Vite sourcemap plugin in this repo; keep
    // any PostHog sourcemap upload as a separately gated CLI/CI step.
    ...createSentryPlugins(),
  ],
  resolve: {
    alias: [
      { find: /^collections\/(.*)$/, replacement: `${fumadocsSourceDir}/$1` },
      { find: /^@\/prisma\/(.*)$/, replacement: `${prismaRoot}/$1` },
      { find: '@', replacement: webRoot },
    ],
  },
  ssr: {
    external: [
      '@prisma/client',
      '@prisma/client/runtime/library',
      '@/prisma/client_multipost',
      '../../prisma/client_multipost',
      generatedPrismaClient,
    ],
    optimizeDeps: {
      exclude: [
        '@prisma/client',
        '@prisma/client/runtime/library',
        '@/prisma/client_multipost',
        '../../prisma/client_multipost',
      ],
    },
  },
}));
