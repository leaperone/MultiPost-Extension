import { useTheme } from 'next-themes'
import { Toaster as SonnerToaster } from 'sonner'
import type { DesktopToastMethod } from '@shared/types'

/**
 * 全局 Toast。样式遵循 DESIGN.md:纸面底、hairline 边、浮层阴影;
 * 成功不染绿(The One Red Rule),仅错误允许警示红。
 *
 * 这个 <Toaster/> 只在透明的 toast overlay surface(overlay.tsx)里挂载一次,
 * 让 toast 浮在所有内容 view 之上。各页面不直接渲染它。
 */
export function Toaster(): React.ReactElement {
  const { resolvedTheme } = useTheme()
  return (
    <SonnerToaster
      position="bottom-right"
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      visibleToasts={5}
      toastOptions={{
        classNames: {
          toast:
            '!bg-card !text-foreground !border-0 !rounded-xl !shadow-[0_8px_32px_rgb(0_0_0/0.14)]',
          title: '!text-sm !font-medium !text-foreground',
          description: '!text-xs !text-muted-foreground',
          actionButton: '!bg-primary !text-primary-foreground !rounded-md',
          cancelButton: '!bg-muted !text-foreground !rounded-md',
          error: '!text-destructive',
          icon: '!text-foreground'
        }
      }}
    />
  )
}

// ---------------------------------------------------------------------------
// toast:发往全局 overlay 的代理。各页面照旧 `import { toast }` 调用,但 toast
// 不再渲染在本 renderer 文档里(那样切到 web/内容 view 后会被裁掉看不见),而是经
// main 转发到透明 overlay view,浮在整个窗口之上。
//
// 仅支持纯数据语义(title/description/duration/id);sonner 的 ReactNode 标题、
// action/cancel 回调、promise/custom 无法跨 IPC,本项目也未使用。
// ---------------------------------------------------------------------------

interface DesktopToastOptions {
  id?: string
  description?: string
  // ms;Infinity 表示常驻(Electron IPC 用结构化克隆,Infinity 可安全传递)
  duration?: number
}

let toastSeq = 0
function nextToastId(): string {
  toastSeq += 1
  return `t-${Date.now()}-${toastSeq}`
}

function emit(method: DesktopToastMethod, title: string, options?: DesktopToastOptions): string {
  const id = options?.id ?? nextToastId()
  window.api.toast.emit({
    id,
    method,
    title,
    description: options?.description,
    duration: options?.duration
  })
  return id
}

interface DesktopToast {
  (title: string, options?: DesktopToastOptions): string
  success: (title: string, options?: DesktopToastOptions) => string
  error: (title: string, options?: DesktopToastOptions) => string
  loading: (title: string, options?: DesktopToastOptions) => string
  info: (title: string, options?: DesktopToastOptions) => string
  warning: (title: string, options?: DesktopToastOptions) => string
  message: (title: string, options?: DesktopToastOptions) => string
  // id 省略时清除全部,沿用 sonner.dismiss 语义
  dismiss: (id?: string) => void
}

const toast = ((title: string, options?: DesktopToastOptions): string =>
  emit('default', title, options)) as DesktopToast
toast.success = (title, options): string => emit('success', title, options)
toast.error = (title, options): string => emit('error', title, options)
toast.loading = (title, options): string => emit('loading', title, options)
toast.info = (title, options): string => emit('info', title, options)
toast.warning = (title, options): string => emit('warning', title, options)
toast.message = (title, options): string => emit('message', title, options)
toast.dismiss = (id): void => window.api.toast.dismiss(id)

export { toast }
