import React from 'react'
import ReactDOM from 'react-dom/client'
import { MotionConfig } from 'framer-motion'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import App from './App'
import { initRendererLogging } from './lib/logger'
import { initSentryRenderer } from './observability/sentry'
import './styles/global.css'

// Crash/error monitoring first, so errors during logging/render setup are
// caught too. Events are forwarded to main, which scrubs and gates them.
initSentryRenderer()

// Before first render: console.error/warn and uncaught errors should be
// captured into renderer.log from the very first frame.
initRendererLogging()

// Toaster 不在这里挂载:它被切到 web/内容 view 后会被裁掉看不见。toast 改由独立的
// 透明 overlay surface(overlay.tsx)全局承载,这里只渲染主 UI。

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <NextThemesProvider attribute="class" defaultTheme="system">
      {/* reducedMotion="user": 尊重系统级减少动态偏好(无障碍基线) */}
      <MotionConfig reducedMotion="user">
        <App />
      </MotionConfig>
    </NextThemesProvider>
  </React.StrictMode>
)
