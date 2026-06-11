import { useState, useEffect, useCallback } from 'react'
import { addToast, Button, Chip, Progress } from '@heroui/react'
import { Download, RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import type { UpdateStatus, UpdateInfo } from '../../../shared/types'

interface UpdateCheckerProps {
  compact?: boolean
}

export function UpdateChecker({ compact = false }: UpdateCheckerProps): React.ReactElement {
  const [status, setStatus] = useState<UpdateStatus>({ status: 'idle' })
  const [appVersion, setAppVersion] = useState<string>('')

  useEffect(() => {
    // Get current app version
    window.api.app.getVersion().then(setAppVersion)

    // Get initial status
    window.api.updater.getStatus().then(setStatus)

    // Listen for status changes
    const unsubscribe = window.api.updater.onStatusChange(setStatus)

    return () => {
      unsubscribe()
    }
  }, [])

  const handleCheckForUpdates = useCallback(async () => {
    // Show feedback immediately; the main process pushes the real status next.
    setStatus({ status: 'checking' })
    try {
      await window.api.updater.checkForUpdates()
    } catch (error) {
      console.error('Failed to check for updates:', error)
      const message = error instanceof Error ? error.message : String(error)
      setStatus({ status: 'error', error: message })
      addToast({
        title: '检查更新失败',
        description: message,
        hideIcon: true
      })
    }
  }, [])

  const handleDownload = useCallback(async () => {
    try {
      await window.api.updater.downloadUpdate()
    } catch (error) {
      console.error('Failed to download update:', error)
      addToast({
        title: '下载更新失败',
        description: error instanceof Error ? error.message : String(error),
        hideIcon: true
      })
    }
  }, [])

  const handleInstall = useCallback(() => {
    window.api.updater.installUpdate()
  }, [])

  const renderStatusIcon = () => {
    switch (status.status) {
      case 'checking':
        return <Loader2 className="size-4 animate-spin" />
      case 'downloading':
        return <Download className="size-4 animate-pulse" />
      case 'available':
        return <Download className="size-4 text-primary" />
      case 'downloaded':
        return <CheckCircle className="size-4 text-success" />
      case 'error':
        return <AlertCircle className="size-4 text-danger" />
      case 'not-available':
        return <CheckCircle className="size-4 text-success" />
      default:
        return <RefreshCw className="size-4" />
    }
  }

  const renderStatusText = () => {
    switch (status.status) {
      case 'checking':
        return '正在检查更新...'
      case 'available':
        return `发现新版本 ${(status.info as UpdateInfo)?.version || ''}`
      case 'downloading':
        return `正在下载更新 ${Math.round(status.progress?.percent || 0)}%`
      case 'downloaded':
        return '更新已下载完成，重启后生效'
      case 'not-available':
        return '当前已是最新版本'
      case 'error':
        return status.error || '检查更新失败'
      default:
        return '点击按钮检查是否有新版本'
    }
  }

  const renderAction = () => {
    switch (status.status) {
      case 'checking':
      case 'downloading':
        return null
      case 'available':
        return (
          <Button size="sm" color="primary" onPress={handleDownload}>
            下载更新
          </Button>
        )
      case 'downloaded':
        return (
          <Button size="sm" color="success" onPress={handleInstall}>
            重启安装
          </Button>
        )
      case 'error':
      case 'not-available':
      case 'idle':
      default:
        return (
          <Button size="sm" variant="flat" onPress={handleCheckForUpdates}>
            检查更新
          </Button>
        )
    }
  }

  const versionChip = appVersion ? (
    <Chip size="sm" variant="flat" className="font-mono">
      v{appVersion}
    </Chip>
  ) : null

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {renderStatusIcon()}
        <span className="text-sm">{renderStatusText()}</span>
        {versionChip}
        {renderAction()}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {renderStatusIcon()}
          <span className="text-sm">{renderStatusText()}</span>
          {versionChip}
        </div>
        {renderAction()}
      </div>

      {status.status === 'downloading' && status.progress && (
        <div className="space-y-1">
          <Progress
            value={status.progress.percent}
            size="sm"
            color="primary"
            aria-label="下载进度"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {formatBytes(status.progress.transferred)} / {formatBytes(status.progress.total)}
            </span>
            <span>{formatBytes(status.progress.bytesPerSecond)}/s</span>
          </div>
        </div>
      )}

      {status.status === 'available' && status.info && (
        <div className="text-xs text-muted-foreground">
          {status.info.releaseDate && (
            <p>发布时间: {new Date(status.info.releaseDate).toLocaleDateString('zh-CN')}</p>
          )}
          {status.info.releaseNotes && typeof status.info.releaseNotes === 'string' && (
            <p className="mt-1 line-clamp-3">{status.info.releaseNotes}</p>
          )}
        </div>
      )}
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
