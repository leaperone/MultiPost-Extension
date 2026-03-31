import { useState, useEffect, useCallback } from 'react'
import { Button, Progress } from '@heroui/react'
import { X, Download, RefreshCw } from 'lucide-react'
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
    <div className="bg-primary text-primary-foreground">
      <div className="max-w-screen-xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {status.status === 'downloading' ? (
            <Download className="size-4 animate-pulse flex-shrink-0" />
          ) : (
            <Download className="size-4 flex-shrink-0" />
          )}

          <span className="text-sm truncate">
            {status.status === 'available' && `新版本 ${version} 可用`}
            {status.status === 'downloading' && `正在下载 ${version}...`}
            {status.status === 'downloaded' && `${version} 已下载完成`}
          </span>

          {status.status === 'downloading' && status.progress && (
            <Progress
              value={status.progress.percent}
              size="sm"
              color="default"
              className="w-24 flex-shrink-0"
              aria-label="下载进度"
            />
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {status.status === 'available' && (
            <Button
              size="sm"
              variant="flat"
              className="bg-white/20 text-white hover:bg-white/30"
              onPress={handleDownload}
            >
              立即下载
            </Button>
          )}

          {status.status === 'downloaded' && (
            <Button
              size="sm"
              variant="flat"
              className="bg-white/20 text-white hover:bg-white/30"
              startContent={<RefreshCw className="size-3" />}
              onPress={handleInstall}
            >
              重启安装
            </Button>
          )}

          <Button
            isIconOnly
            size="sm"
            variant="light"
            className="text-white/80 hover:text-white hover:bg-white/10"
            onPress={() => setDismissed(true)}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
