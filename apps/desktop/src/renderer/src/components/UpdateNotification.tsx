import { useState, useEffect, useCallback } from 'react'
import { X, Download, RefreshCw } from 'lucide-react'
import { Button } from './ui/button'
import { Progress } from './ui/progress'
import { toast } from './ui/sonner'
import type { UpdateStatus, UpdateInfo } from '../../../shared/types'

export function UpdateNotification(): React.ReactElement | null {
  const [status, setStatus] = useState<UpdateStatus>({ status: 'idle' })
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Get initial status
    window.api.updater.getStatus().then(setStatus)

    // Listen for status changes
    const unsubscribe = window.api.updater.onStatusChange((newStatus) => {
      setStatus(newStatus)
      // Reset dismissed when new update is available
      if (newStatus.status === 'available') {
        setDismissed(false)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const handleDownload = useCallback(async () => {
    try {
      await window.api.updater.downloadUpdate()
    } catch (error) {
      console.error('Failed to download update:', error)
      toast.error('下载更新失败', { description: '检查下网络再重试。' })
    }
  }, [])

  const handleInstall = useCallback(() => {
    window.api.updater.installUpdate()
  }, [])

  // Only show for available, downloading, or downloaded states
  const shouldShow =
    !dismissed &&
    (status.status === 'available' ||
      status.status === 'downloading' ||
      status.status === 'downloaded')

  if (!shouldShow) {
    return null
  }

  const version = (status.info as UpdateInfo)?.version || ''

  return (
    <div className="border-t border-border/60 bg-card text-foreground">
      <div className="mx-auto flex max-w-screen-xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2">
        <div className="flex min-w-0 flex-1 basis-56 items-center gap-3">
          {status.status === 'downloading' ? (
            <Download className="size-4 animate-pulse flex-shrink-0 text-muted-foreground" />
          ) : (
            <Download className="size-4 flex-shrink-0 text-muted-foreground" />
          )}

          <span className="text-sm truncate">
            {status.status === 'available' && `新版本 ${version} 可用`}
            {status.status === 'downloading' && `正在下载 ${version}...`}
            {status.status === 'downloaded' && `${version} 已下载完成`}
          </span>

          {status.status === 'downloading' && status.progress && (
            <Progress
              value={status.progress.percent}
              className="w-24 flex-shrink-0"
              aria-label="下载进度"
            />
          )}
        </div>

        <div className="ml-auto flex flex-shrink-0 items-center gap-2">
          {status.status === 'available' && (
            <Button size="sm" variant="default" onClick={handleDownload}>
              立即下载
            </Button>
          )}

          {status.status === 'downloaded' && (
            <Button size="sm" variant="default" onClick={handleInstall}>
              <RefreshCw />
              重启安装
            </Button>
          )}

          <Button
            size="icon-sm"
            variant="ghost"
            className="text-muted-foreground"
            aria-label="暂不更新，关闭提示"
            onClick={() => setDismissed(true)}
          >
            <X />
          </Button>
        </div>
      </div>
    </div>
  )
}
