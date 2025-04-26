// tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['worker/main.ts'],
  format: ['cjs'], // 可以是 'esm'，但 node 原生执行要小心
  platform: 'node',
  target: 'node18',
  bundle: true, // 关键点，必须打包依赖
  outDir: 'worker/dist',
  clean: true,
  noExternal: [
    'fastify',
    'ipaddr.js',
    '@fastify/proxy-addr',
    'fast-json-stringify',
    'ajv',
    'archy',
    'fast-deep-equal',
    'fast-redact',
    'rfdc',
    'secure-json-parse',
    'sonic-boom',
    'openai',
    'dotenv',
    'prisma',
    'zod',
    'zod-to-json-schema',
    'zod-to-ts',
    'decimal.js',
    '@prisma/client',
  ],
});
