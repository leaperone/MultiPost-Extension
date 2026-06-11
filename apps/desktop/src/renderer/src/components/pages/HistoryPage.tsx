import { useState, useEffect, useCallback } from 'react'
import { History, CheckCircle, XCircle, Circle, ExternalLink, Trash2, RefreshCw } from 'lucide-react'
import { PLATFORMS } from '@shared/constants'
import type { PublishHistory, PublishHistoryStatus, PlatformType } from '@shared/types'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Card } from '../ui/card'
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs'
import { Tooltip } from '../ui/tooltip'
import { ConfirmDialog } from '../ui/confirm-dialog'
import { Spinner } from '../ui/spinner'
import { toast } from '../ui/sonner'

// 状态只靠 Lucide 图标 + 文字表达(The One Red Rule):失败才允许警示红
const STATUS_META: Record<PublishHistoryStatus, { label: string; className: string }> = {
  success: { label: '成功', className: 'text-foreground' },
  failed: { label: '失败', className: 'text-destructive' },
  pending: { label: '等待中', className: 'text-muted-foreground' }
}

function StatusIndicator({ status }: { status: PublishHistoryStatus }): React.ReactElement {
  const meta = STATUS_META[status]
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 text-xs ${meta.className}`}>
      {status === 'success' ? (
        <CheckCircle className="size-3.5" />
      ) : status === 'failed' ? (
        <XCircle className="size-3.5" />
      ) : (
        <Circle className="size-3.5" />
      )}
      {meta.label}
    </span>
  )
}

const STATUS_TABS: Array<{ key: PublishHistoryStatus | 'all'; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'success', label: '成功' },
  { key: 'failed', label: '失败' },
  { key: 'pending', label: '等待中' }
]

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`

  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function HistoryPage(): React.ReactElement {
  const [history, setHistory] = useState<PublishHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<PublishHistoryStatus | 'all'>('all')
  const [itemToDelete, setItemToDelete] = useState<PublishHistory | null>(null)

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true)
      const data = await window.api.history.list({
        status: selectedStatus === 'all' ? undefined : selectedStatus,
        limit: 100
      })
      setHistory(data)
    } catch (error) {
      console.error('Failed to load history:', error)
      toast.error('无法加载发布历史', { description: '请点击刷新重试' })
    } finally {
      setLoading(false)
    }
  }, [selectedStatus])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const handleDelete = async (id: string) => {
    try {
      await window.api.history.delete(id)
      setHistory((prev) => prev.filter((h) => h.id !== id))
      toast('发布记录已删除')
    } catch (error) {
      console.error('Failed to delete history:', error)
      toast.error('无法删除发布记录', { description: '请稍后重试' })
    }
  }

  const handleOpenPost = (url: string) => {
    window.open(url, '_blank')
  }

  const groupedHistory = history.reduce(
    (acc, item) => {
      const date = new Date(item.createdAt).toLocaleDateString('zh-CN')
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(item)
      return acc
    },
    {} as Record<string, PublishHistory[]>
  )

  const successCount = history.filter((h) => h.status === 'success').length
  const failedCount = history.filter((h) => h.status === 'failed').length
  const isFiltered = selectedStatus !== 'all'

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-4 xl:max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">发布历史</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {successCount} 成功 ·{' '}
            <span className={failedCount > 0 ? 'text-destructive' : undefined}>
              {failedCount}
            </span>{' '}
            失败
          </span>
          <Tooltip content="刷新列表">
            <Button size="icon-sm" variant="secondary" aria-label="刷新列表" onClick={loadHistory}>
              <RefreshCw />
            </Button>
          </Tooltip>
        </div>
      </div>

      <Tabs
        value={selectedStatus}
        onValueChange={(value) => setSelectedStatus(value as PublishHistoryStatus | 'all')}
      >
        <TabsList>
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner label="加载中" />
        </div>
      ) : history.length === 0 ? (
        <div className="flex h-56 flex-col items-center justify-center gap-3 rounded-xl bg-muted">
          <div className="flex size-14 items-center justify-center rounded-full bg-background text-muted-foreground">
            <History className="size-7" />
          </div>
          <p className="font-medium">
            {isFiltered ? '这个状态下没有记录' : '还没有发布记录'}
          </p>
          <p className="text-sm text-muted-foreground">
            {isFiltered ? '试试切换到全部' : '发布内容后，记录会出现在这里'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {Object.entries(groupedHistory).map(([date, items]) => (
            <div key={date} className="flex flex-col gap-2">
              {/* 日期作 muted 小标题坐画布上，记录组是一块软表面 */}
              <h2 className="px-1 text-xs font-medium text-muted-foreground">{date}</h2>
              <Card className="divide-y divide-border/60 overflow-hidden">
                {items.map((item) => {
                  const platform = PLATFORMS[item.platform as PlatformType]
                  return (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-start gap-x-3 gap-y-2 px-4 py-3 transition-colors hover:bg-foreground/[0.03]"
                    >
                      <div className="flex min-w-0 flex-1 basis-56 flex-col gap-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm font-medium">
                            {item.title || '无标题'}
                          </span>
                          <Badge size="sm" className="shrink-0">
                            {platform?.name || item.platform}
                          </Badge>
                        </div>
                        {item.content && (
                          <p className="line-clamp-1 text-xs text-muted-foreground">
                            {item.content}
                          </p>
                        )}
                        {item.status === 'failed' && item.errorMessage && (
                          <p className="text-xs text-destructive">
                            失败原因：{item.errorMessage}
                          </p>
                        )}
                      </div>
                      <div className="ml-auto flex shrink-0 items-center gap-3 pt-0.5">
                        <StatusIndicator status={item.status} />
                        <span className="text-xs text-muted-foreground">
                          {formatTime(item.publishedAt || item.createdAt)}
                        </span>
                        {item.platformPostUrl && (
                          <Tooltip content="查看帖子">
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              aria-label="查看帖子"
                              onClick={() => handleOpenPost(item.platformPostUrl!)}
                            >
                              <ExternalLink />
                            </Button>
                          </Tooltip>
                        )}
                        <Tooltip content="删除记录">
                          <Button
                            size="icon-sm"
                            variant="destructive-ghost"
                            aria-label="删除记录"
                            onClick={() => setItemToDelete(item)}
                          >
                            <Trash2 />
                          </Button>
                        </Tooltip>
                      </div>
                    </div>
                  )
                })}
              </Card>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={itemToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setItemToDelete(null)
        }}
        title={`删除发布记录「${itemToDelete?.title || '无标题'}」？`}
        description="只删除本地记录，不影响平台上已发布的内容。"
        confirmText="删除"
        onConfirm={async () => {
          if (itemToDelete) await handleDelete(itemToDelete.id)
        }}
      />
    </div>
  )
}
