import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import tailwindcss from '@tailwindcss/vite';
import viteReact from '@vitejs/plugin-react';
import { config as dotenvConfig } from 'dotenv';
import fumadocsMdx from 'fumadocs-mdx/vite';
import { defineConfig } from 'vite';
import tsConfigPaths from 'vite-tsconfig-paths';
import * as sourceConfig from './source.config';

const webRoot = fileURLToPath(new URL('.', import.meta.url));
const monorepoRoot = path.resolve(webRoot, '../..');
const prismaRoot = path.join(monorepoRoot, 'prisma');
const generatedPrismaClient = path.join(prismaRoot, 'client_multipost');
const fumadocsSourceDir = path.join(webRoot, '.source');

// Load monorepo root env files the same way next.config.mjs did.
dotenvConfig({ path: path.join(monorepoRoot, '.env.local'), override: true });
dotenvConfig({ path: path.join(monorepoRoot, '.env') });

export default defineConfig(async () => ({
  server: {
    port: 3000,
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
    // TODO(Phase 8): add Sentry and PostHog source map upload here, gated on
    // CI plus the relevant auth-token/project env vars.
    tanstackStart(),
    viteReact(),
    tailwindcss(),
    tsConfigPaths({ projects: [path.join(webRoot, 'tsconfig.json')] }),
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
