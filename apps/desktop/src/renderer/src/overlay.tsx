import React, { useEffect, useRef } from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { toast as sonnerToast } from 'sonner'
import { Toaster } from './components/ui/sonner'
import { initRendererLogging } from './lib/logger'
import './styles/global.css'
import type { DesktopToastPayload } from '@shared/types'

initRendererLogging()

// 透明 toast overlay surface:挂在一个独立的、始终最顶层的 WebContentsView 里,
// 让 toast 浮在所有内容 view(web 工作台 / 账号页 / 发布组)之上。渲染/消除由
// main 转发(其他 renderer 调 toast() → main → 这里);本 surface 反过来把 toast
// 实际占用的高度上报给 main,main 据此把 overlay view 收缩贴合右下角(无 toast 时
// 移出窗口),从而只有 toast 可见区域拦截鼠标,其余照常穿透到下方网页。

// sonner toast 默认宽 356 + 两侧 offset,固定一个够用的画布宽度,避免横向抖动。
const TOAST_OVERLAY_WIDTH = 420

function renderToast(payload: DesktopToastPayload): void {
  const options = { id: payload.id, description: payload.description, duration: payload.duration }
  switch (payload.method) {
    case 'success':
      sonnerToast.success(payload.title, options)
      break
    case 'error':
      sonnerToast.error(payload.title, options)
      break
    case 'loading':
      sonnerToast.loading(payload.title, options)
      break
    case 'info':
      sonnerToast.info(payload.title, options)
      break
    case 'warning':
      sonnerToast.warning(payload.title, options)
      break
    case 'message':
      sonnerToast.message(payload.title, options)
      break
    default:
      sonnerToast(payload.title, options)
      break
  }
}

function ToastOverlay(): React.ReactElement {
  // 上次上报的高度;null 代表当前无可见 toast(overlay 已被 main 移出窗口)
  const lastReportedRef = useRef<number | null>(null)

  // 接收 main 转发的渲染/消除指令
  useEffect(() => {
    const offRender = window.api.toastHost.onRender(renderToast)
    const offDismiss = window.api.toastHost.onDismiss((id) => sonnerToast.dismiss(id))
    return () => {
      offRender()
      offDismiss()
    }
  }, [])

  // 把 toast 实际占用高度上报给 main(贴合 overlay view 的 bounds)
  useEffect(() => {
    let raf = 0
    let observedToaster: Element | null = null
    const ro = new ResizeObserver(() => schedule())
    const mo = new MutationObserver(() => schedule())

    const measure = (): void => {
      const toaster = document.querySelector('[data-sonner-toaster]') as HTMLElement | null
      // sonner 容器只在挂载后出现;首次拿到时补绑 ResizeObserver
      if (toaster && observedToaster !== toaster) {
        if (observedToaster) ro.unobserve(observedToaster)
        ro.observe(toaster)
        observedToaster = toaster
      }
      const hasToast = !!toaster && toaster.querySelectorAll('[data-sonner-toast]').length > 0
      if (!hasToast) {
        if (lastReportedRef.current !== null) {
          lastReportedRef.current = null
          window.api.toastHost.reportSize(null)
        }
        return
      }
      // 容器是 position:fixed,viewport 高度不影响其布局盒,getBoundingClientRect
      // 的 height 即真实堆叠高度。+24 缓冲容纳进出场动画(swipe/expand)瞬时溢出。
      const height = Math.ceil(toaster!.getBoundingClientRect().height) + 24
      if (lastReportedRef.current !== null && Math.abs(lastReportedRef.current - height) < 2) {
        return
      }
      lastReportedRef.current = height
      window.api.toastHost.reportSize({ width: TOAST_OVERLAY_WIDTH, height })
    }

    const schedule = (): void => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(measure)
    }

    // body 子树的增删/属性变化(toast 进出、展开、样式过渡)都触发重新测量
    mo.observe(document.body, { childList: true, subtree: true, attributes: true })
    schedule()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      mo.disconnect()
    }
  }, [])

  return <Toaster />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <NextThemesProvider attribute="class" defaultTheme="system">
    <ToastOverlay />
  </NextThemesProvider>
)
