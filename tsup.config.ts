// tsup.config.ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['worker/main.ts'],
  format: ['cjs'], // 可以是 'esm'，但 node 原生执行要小心
  platform: 'node',
  target: 'node18',
  bundle: true, // 关键点，必须打包依赖
  outDir: 'worker/dist',
  clean: true,
})
