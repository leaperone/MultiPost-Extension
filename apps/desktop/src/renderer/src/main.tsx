import React from 'react'
import ReactDOM from 'react-dom/client'
import { MotionConfig } from 'framer-motion'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import App from './App'
import { Toaster } from './components/ui/sonner'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <NextThemesProvider attribute="class" defaultTheme="system">
      {/* reducedMotion="user": 尊重系统级减少动态偏好(无障碍基线) */}
      <MotionConfig reducedMotion="user">
        <App />
        <Toaster />
      </MotionConfig>
    </NextThemesProvider>
  </React.StrictMode>
)
