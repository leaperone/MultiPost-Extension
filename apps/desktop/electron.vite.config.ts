import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin, loadEnv } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  // 第三个参数为空字符串，加载所有环境变量（不限制前缀）
  const env = loadEnv(mode, process.cwd(), '')
  console.log('[Config] MULTIPOST_WEB_URL:', env.MULTIPOST_WEB_URL)

  return {
    main: {
      plugins: [externalizeDepsPlugin()],
      define: {
        'process.env.MULTIPOST_WEB_URL': JSON.stringify(env.MULTIPOST_WEB_URL)
      },
      resolve: {
        alias: {
          '@main': resolve('src/main'),
          '@shared': resolve('src/shared')
        }
      },
      build: {
        rollupOptions: {
          external: ['better-sqlite3']
        }
      }
    },
    preload: {
      plugins: [externalizeDepsPlugin()],
      resolve: {
        alias: {
          '@shared': resolve('src/shared')
        }
      },
      build: {
        rollupOptions: {
          input: {
            index: resolve('src/preload/index.ts'),
            webview: resolve('src/preload/webview.ts')
          }
        }
      }
    },
    renderer: {
      resolve: {
        alias: {
          '@renderer': resolve('src/renderer/src'),
          '@shared': resolve('src/shared'),
          '@': resolve('src/renderer/src')
        }
      },
      plugins: [tailwindcss(), react()]
    }
  }
})
