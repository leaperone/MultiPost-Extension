import React, { useCallback, useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { toast as sonnerToast } from 'sonner'
import { BellOff, Download, RefreshCw, X } from 'lucide-react'
import { Button } from './components/ui/button'
import { Progress } from './components/ui/progress'
import { Toaster } from './components/ui/sonner'
import { initRendererLogging } from './lib/logger'
import { initSentryRenderer } from './observability/sentry'
import './styles/global.css'
import type { DesktopToastPayload, UpdateInfo, UpdateStatus } from '@shared/types'

initSentryRenderer()
initRendererLogging()

// 透明 toast overlay surface:挂在一个独立的、始终最顶层的 WebContentsView 里,
// 让 toast 浮在所有内容 view(web 工作台 / 账号页 / 发布组)之上。渲染/消除由
// main 转发(其他 renderer 调 toast() → main → 这里);本 surface 反过来把 toast
// 实际占用的高度上报给 main,main 据此把 overlay view 收缩贴合右下角(无 toast 时
// 移出窗口),从而只有 toast 可见区域拦截鼠标,其余照常穿透到下方网页。

// sonner toast 默认宽 356 + 两侧 offset,固定一个够用的画布宽度,避免横向抖动。
const TOAST_OVERLAY_WIDTH = 420
const UPDATE_BANNER_TOAST_ID = 'app-update'

type UpdateBannerStatus = 'available' | 'downloading' | 'downloaded'

interface UpdateBannerContentProps {
  status: UpdateBannerStatus
  version: string
  progress?: number
  onDownload: () => void
  onLater: () => void
  onIgnore: () => void
  onInstall: () => void
}

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

function isBannerStatus(status: UpdateStatus['status']): status is UpdateBannerStatus {
  return status === 'available' || status === 'downloading' || status === 'downloaded'
}

function getUpdateVersion(status: UpdateStatus, lastInfo: UpdateInfo | null): string {
  return status.info?.version ?? lastInfo?.version ?? ''
}

function normalizeProgress(percent: number | undefined): number | undefined {
  if (typeof percent !== 'number' || !Number.isFinite(percent)) return undefined
  return Math.max(0, Math.min(100, percent))
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function UpdateBannerContent({
  status,
  version,
  progress,
  onDownload,
  onLater,
  onIgnore,
  onInstall
}: UpdateBannerContentProps): React.ReactElement {
  const progressValue = normalizeProgress(progress)
  const progressLabel =
    typeof progressValue === 'number' ? `${Math.round(progressValue)}%` : undefined

  const icon =
    status === 'downloaded' ? (
      <RefreshCw className="size-4" />
    ) : (
      <Download className={status === 'downloading' ? 'size-4 animate-pulse' : 'size-4'} />
    )

  return (
    <div className="flex w-[356px] max-w-[calc(100vw-32px)] flex-col gap-3 p-4 text-foreground">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.03] text-foreground">
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {status === 'available' && (
                  <>
                    新版本 {version ? <span className="font-mono">v{version}</span> : null} 可用
                  </>
                )}
                {status === 'downloading' && <>正在下载更新 {progressLabel ?? ''}</>}
                {status === 'downloaded' && (
                  <>
                    {version ? <span className="font-mono">v{version}</span> : '更新'} 已下载完成
                  </>
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {status === 'available' && '下载完成后可重启安装。'}
                {status === 'downloading' && (
                  <>{version ? <span className="font-mono">v{version}</span> : '更新'} 下载中</>
                )}
                {status === 'downloaded' && '重启应用以完成安装。'}
              </p>
            </div>

            <Button
              size="icon-sm"
              variant="ghost"
              className="-mr-1 -mt-1 text-muted-foreground"
              aria-label="稍后提醒"
              onClick={onLater}
            >
              <X />
            </Button>
          </div>
        </div>
      </div>

      {status === 'downloading' && typeof progressValue === 'number' && (
        <div className="space-y-1.5">
          <Progress value={progressValue} aria-label="下载进度" />
          <div className="text-right text-xs text-muted-foreground">{progressLabel}</div>
        </div>
      )}

      {status !== 'downloading' && (
        <div className="flex justify-end gap-2">
          {status === 'available' && (
            <Button size="sm" variant="secondary" onClick={onIgnore}>
              <BellOff />
              忽略
            </Button>
          )}

          {status === 'available' && (
            <Button size="sm" variant="default" onClick={onDownload}>
              <Download />
              下载
            </Button>
          )}

          {status === 'downloaded' && (
            <Button size="sm" variant="default" onClick={onInstall}>
              <RefreshCw />
              重启安装
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

function UpdateBannerController(): null {
  const [status, setStatus] = useState<UpdateStatus>({ status: 'idle' })
  const [ignoredVersion, setIgnoredVersion] = useState<string | null | undefined>(undefined)
  // Dismissal is scoped per version AND per stage. Two reasons: a duplicate
  // `available` broadcast (or a manual re-check) for the same version must not
  // un-snooze it, and snoozing the `available`/`downloading` prompt must NOT
  // suppress the later, more important `downloaded` restart prompt.
  const [dismissed, setDismissed] = useState<{
    available: string | null
    downloaded: string | null
  }>({ available: null, downloaded: null })
  const [lastInfo, setLastInfo] = useState<UpdateInfo | null>(null)

  useEffect(() => {
    let cancelled = false

    window.api.updater
      .getStatus()
      .then((initialStatus) => {
        if (cancelled) return
        setStatus(initialStatus)
        if (initialStatus.info) setLastInfo(initialStatus.info)
      })
      .catch((error) => {
        console.error('Failed to get update status:', error)
      })

    window.api.updater
      .getIgnoredVersion()
      .then((version) => {
        if (!cancelled) setIgnoredVersion(version)
      })
      .catch((error) => {
        console.error('Failed to get ignored update version:', error)
        if (!cancelled) setIgnoredVersion(null)
      })

    const unsubscribe = window.api.updater.onStatusChange((nextStatus) => {
      setStatus(nextStatus)
      if (nextStatus.info) setLastInfo(nextStatus.info)
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    return () => {
      sonnerToast.dismiss(UPDATE_BANNER_TOAST_ID)
    }
  }, [])

  const handleDownload = useCallback(async () => {
    try {
      await window.api.updater.downloadUpdate()
    } catch (error) {
      console.error('Failed to download update:', error)
      sonnerToast.error('下载更新失败', { description: '检查下网络再重试。' })
    }
  }, [])

  const handleInstall = useCallback(async () => {
    try {
      await window.api.updater.installUpdate()
    } catch (error) {
      console.error('Failed to install update:', error)
      sonnerToast.error('安装更新失败', { description: getErrorMessage(error) })
    }
  }, [])

  // available/downloading share the "available" snooze bucket; downloaded is its own.
  const handleLater = useCallback((stage: 'available' | 'downloaded', version: string) => {
    setDismissed((prev) => ({ ...prev, [stage]: version }))
    sonnerToast.dismiss(UPDATE_BANNER_TOAST_ID)
  }, [])

  const handleIgnoreVersion = useCallback(async (version: string) => {
    if (!version) {
      sonnerToast.dismiss(UPDATE_BANNER_TOAST_ID)
      return
    }

    try {
      const normalized = await window.api.updater.ignoreVersion(version)
      setIgnoredVersion(normalized)
      sonnerToast.dismiss(UPDATE_BANNER_TOAST_ID)
    } catch (error) {
      console.error('Failed to ignore update version:', error)
      sonnerToast.error('忽略版本失败', { description: getErrorMessage(error) })
    }
  }, [])

  // Derived scalars so the emit effect re-fires only when the rendered content
  // changes — not on every fractional download-progress payload.
  const bannerStatus = isBannerStatus(status.status) ? status.status : null
  const version = getUpdateVersion(status, lastInfo)
  const rawProgress = status.status === 'downloading' ? normalizeProgress(status.progress?.percent) : undefined
  const progressKey = typeof rawProgress === 'number' ? Math.round(rawProgress) : -1
  const stage: 'available' | 'downloaded' = bannerStatus === 'downloaded' ? 'downloaded' : 'available'
  const dismissedVersion = dismissed[stage]

  useEffect(() => {
    if (ignoredVersion === undefined || bannerStatus === null) {
      sonnerToast.dismiss(UPDATE_BANNER_TOAST_ID)
      return
    }

    const isDismissed = dismissedVersion !== null && dismissedVersion === version
    if (isDismissed || (version !== '' && ignoredVersion === version)) {
      sonnerToast.dismiss(UPDATE_BANNER_TOAST_ID)
      return
    }

    sonnerToast.custom(
      () => (
        <UpdateBannerContent
          status={bannerStatus}
          version={version}
          progress={progressKey >= 0 ? progressKey : undefined}
          onDownload={() => {
            void handleDownload()
          }}
          onLater={() => handleLater(stage, version)}
          onIgnore={() => {
            void handleIgnoreVersion(version)
          }}
          onInstall={() => {
            void handleInstall()
          }}
        />
      ),
      { id: UPDATE_BANNER_TOAST_ID, duration: Infinity }
    )
  }, [
    bannerStatus,
    version,
    progressKey,
    stage,
    dismissedVersion,
    ignoredVersion,
    handleDownload,
    handleIgnoreVersion,
    handleInstall,
    handleLater
  ])

  return null
}

function ToastOverlay(): React.ReactElement {
  // 上次上报的高度;null 代表当前无可见 toast(overlay 已被 main 移出窗口);
  // undefined 代表尚未上报,首次空态也要发 null 作为 overlay readiness 信号。
  const lastReportedRef = useRef<number | null | undefined>(undefined)

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
      const viewportBottom = window.innerHeight
      // Only count toasts Sonner currently shows. With visibleToasts>1 the
      // overflow/collapsed toasts stay in the DOM with nonzero layout rects but
      // data-visible="false"; including them would inflate the reported height
      // and leave the overlay covering empty content as a transparent click trap.
      const toastRects = Array.from(
        document.querySelectorAll<HTMLElement>('[data-sonner-toast][data-visible="true"]')
      )
        .map((toast) => {
          const style = window.getComputedStyle(toast)
          if (style.display === 'none' || style.visibility === 'hidden') return null
          if (style.pointerEvents === 'none' || Number(style.opacity) === 0) return null
          const rect = toast.getBoundingClientRect()
          if (rect.width <= 0 || rect.height <= 0) return null
          return rect
        })
        .filter((rect): rect is DOMRect => rect !== null)

      if (toastRects.length === 0) {
        if (lastReportedRef.current !== null) {
          lastReportedRef.current = null
          window.api.toastHost.reportSize(null)
        }
        return
      }
      // Height must be robust two ways: (1) bootstrap the parked (height:1)
      // overlay in one pass — the toaster's intrinsic content height is
      // viewport-independent and does that; (2) cover a custom toast that may
      // not grow the toaster — the visible-toast union does that. Use the larger
      // of the two, plus a 24px buffer for enter/exit animations.
      const toasterHeight = toaster ? Math.ceil(toaster.getBoundingClientRect().height) : 0
      const minTop = Math.min(...toastRects.map((rect) => rect.top))
      const unionHeight = Math.ceil(viewportBottom - minTop)
      const height = Math.max(toasterHeight, unionHeight) + 24
      const lastReported = lastReportedRef.current
      if (typeof lastReported === 'number' && Math.abs(lastReported - height) < 2) {
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

  return (
    <>
      <Toaster />
      <UpdateBannerController />
    </>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <NextThemesProvider attribute="class" defaultTheme="system">
    <ToastOverlay />
  </NextThemesProvider>
)
