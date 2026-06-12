import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin, loadEnv } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import {
  injectorBundlesVirtualModulePlugin,
  injectorContentHelperVirtualModulePlugin
} from './scripts/injector-bundles.mjs'

export default defineConfig(({ mode }) => {
  // 第三个参数为空字符串，加载所有环境变量（不限制前缀）
  const env = loadEnv(mode, process.cwd(), '')
  console.log('[Config] MULTIPOST_WEB_URL:', env.MULTIPOST_WEB_URL)

  // Raise the source-reading bar for shipped builds, but keep dev stack traces readable
  const minify = mode === 'production' ? ('esbuild' as const) : false

  return {
    main: {
      plugins: [injectorBundlesVirtualModulePlugin(), externalizeDepsPlugin()],
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
        minify,
        rollupOptions: {
          external: ['better-sqlite3']
        }
      }
    },
    preload: {
      plugins: [injectorContentHelperVirtualModulePlugin(), externalizeDepsPlugin()],
      resolve: {
        alias: {
          '@shared': resolve('src/shared')
        }
      },
      build: {
        minify,
        rollupOptions: {
          input: {
            index: resolve('src/preload/index.ts'),
            'injector-helper': resolve('src/preload/injector-helper.ts'),
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
      plugins: [tailwindcss(), react()],
      build: {
        minify,
        rollupOptions: {
          input: {
            // 主 UI 入口
            index: resolve('src/renderer/index.html'),
            // 透明 toast 浮层 surface(独立 WebContentsView 加载)
            overlay: resolve('src/renderer/overlay.html')
          }
        }
      }
    }
  }
})
