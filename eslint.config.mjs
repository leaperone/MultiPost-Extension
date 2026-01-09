import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

const eslintConfig = defineConfig([
  ...nextVitals,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'backend/**', 'worker/**', 'scripts/**']),
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
