import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

const eslintConfig = defineConfig([
  ...nextVitals,
  globalIgnores([
    // Monorepo: each app/package has its own toolchain
    'apps/desktop/**',
    'apps/extension/**',
    'apps/backend/**',
    'apps/video-stt-worker/**',
    'packages/**',
    // Build outputs
    '.next/**',
    'out/**',
    'build/**',
    'node_modules/**',
    'next-env.d.ts',
  ]),
  {
    rules: {
      '@next/next/no-img-element': 'warn',
      'jsx-a11y/alt-text': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'import/no-anonymous-default-export': 'off',
    },
  },
]);

export default eslintConfig;
