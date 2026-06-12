import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import tailwindcss from '@tailwindcss/vite';
import viteReact from '@vitejs/plugin-react';
import { config as dotenvConfig } from 'dotenv';
import fumadocsMdx from 'fumadocs-mdx/vite';
import { defineConfig, type Plugin } from 'vite';
import tsConfigPaths from 'vite-tsconfig-paths';
import { createInjectorBuilder, INJECTOR_SCHEMA_VERSION, normalizeBundle, sha256Hex } from '@multipost/injectors/build';
import { getBlogPrerenderPaths, getDocsPrerenderPaths } from './src/lib/content-prerender-paths';
import * as sourceConfig from './source.config';

const webRoot = fileURLToPath(new URL('.', import.meta.url));
const monorepoRoot = path.resolve(webRoot, '../..');
const dbRoot = path.join(monorepoRoot, 'db');
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

const sentrySourceMapsEnabled = Boolean(sentryAuthToken && sentryOrg && sentryProject && sentryRelease);

const docsAndBlogPrerenderPages = Array.from(new Set([...getDocsPrerenderPaths(), ...getBlogPrerenderPaths()])).map(
  (pagePath) => ({
    path: pagePath,
    prerender: {
      enabled: true,
      crawlLinks: false,
    },
  }),
);

// Compile the shared injector scripts and emit them as static files for desktop
// hot-update. Runs only in the client build so files land in dist/client/injectors
// (the production server serves dist/client, not dist/server). Each bundle file is
// content-hashed (filename carries the sha); manifest.json indexes them. The sha is
// computed over the path-normalized bundle so an unchanged script produces the same
// sha as the desktop built-in bundle and is not needlessly re-fetched after a deploy.
function injectorsEmitPlugin(): Plugin {
  const injectorsRoot = path.join(monorepoRoot, 'packages/injectors');
  const injectorsSrc = path.join(injectorsRoot, 'src');
  const builder = createInjectorBuilder({
    sourceRoot: injectorsSrc,
    syncRoot: injectorsSrc,
    contentsRoot: injectorsSrc,
    entriesPath: path.join(monorepoRoot, 'apps/desktop/src/main/injectors/bundleEntries.json'),
    contentHelperEntry: path.join(injectorsSrc, 'helper.ts'),
    tsconfigPath: path.join(injectorsRoot, 'tsconfig.json'),
    absWorkingDir: injectorsRoot,
  });

  return {
    name: 'multipost-web-injectors-emit',
    async generateBundle() {
      // Only the client build serves files publicly (dist/client). Skip SSR/server.
      const environmentName = (this as { environment?: { name?: string } }).environment?.name;
      if (environmentName && environmentName !== 'client') return;

      const { bundles } = await builder.buildBundleResult();
      const entries = Object.entries(bundles)
        .map(([extensionKey, iife]) => {
          const sha256 = sha256Hex(normalizeBundle(iife));
          const fileName = `injectors/${extensionKey}.${sha256.slice(0, 16)}.js`;
          this.emitFile({ type: 'asset', fileName, source: iife });
          return { extensionKey, sha256, schemaVersion: INJECTOR_SCHEMA_VERSION, url: `/${fileName}` };
        })
        .sort((a, b) => a.extensionKey.localeCompare(b.extensionKey));

      const manifest = { schemaVersion: INJECTOR_SCHEMA_VERSION, generatedBy: 'web-build', entries };
      this.emitFile({ type: 'asset', fileName: 'injectors/manifest.json', source: `${JSON.stringify(manifest, null, 2)}\n` });
    },
  };
}

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
    injectorsEmitPlugin(),
    // PostHog does not provide a clean Vite sourcemap plugin in this repo; keep
    // any PostHog sourcemap upload as a separately gated CLI/CI step.
    ...createSentryPlugins(),
  ],
  resolve: {
    alias: [
      { find: /^collections\/(.*)$/, replacement: `${fumadocsSourceDir}/$1` },
      { find: /^@db\/(.*)$/, replacement: `${dbRoot}/$1` },
      { find: '@', replacement: path.join(webRoot, 'src') },
    ],
  },
}));
