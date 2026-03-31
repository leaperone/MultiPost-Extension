import { useState, useEffect, useCallback } from 'react'
import { History, CheckCircle, XCircle, Clock, ExternalLink, Trash2, RefreshCw } from 'lucide-react'
import { Button } from '@heroui/react'
import { Card, CardBody, CardHeader } from '@heroui/react'
import { Chip } from '@heroui/react'
import { Tabs, Tab } from '@heroui/react'
import { addToast } from '@heroui/react'
import { PLATFORMS } from '@shared/constants'
import type { PublishHistory, PublishHistoryStatus, PlatformType } from '@shared/types'

const statusConfig: Record<
  PublishHistoryStatus,
  { label: string; icon: React.ReactNode; color: 'success' | 'danger' | 'warning' | 'default' }
> = {
  success: { label: '成功', icon: <CheckCircle className="size-3" />, color: 'success' },
  failed: { label: '失败', icon: <XCircle className="size-3" />, color: 'danger' },
  pending: { label: '等待中', icon: <Clock className="size-3" />, color: 'warning' }
}

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
      addToast({
        title: '加载失败',
        description: '无法加载发布历史',
        hideIcon: true
      })
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
      addToast({
        title: '删除成功',
        description: '发布记录已删除',
        hideIcon: true
      })
    } catch (error) {
      console.error('Failed to delete history:', error)
      addToast({
        title: '删除失败',
        description: '无法删除发布记录',
        hideIcon: true
      })
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

  return (
    <div className="flex flex-col h-full p-4 gap-4 overflow-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">发布历史</h1>
        <div className="flex items-center gap-2">
          <Chip variant="flat" color="success">
            {successCount} 成功
          </Chip>
          <Chip variant="flat" color="danger">
            {failedCount} 失败
          </Chip>
          <Button size="sm" variant="bordered" isIconOnly onPress={loadHistory}>
            <RefreshCw className="size-4" />
          </Button>
        </div>
      </div>

      <Tabs
        selectedKey={selectedStatus}
        onSelectionChange={(key) => setSelectedStatus(key as PublishHistoryStatus | 'all')}
      >
        <Tab key="all" title="全部" />
        <Tab key="success" title="成功" />
        <Tab key="failed" title="失败" />
        <Tab key="pending" title="等待中" />
      </Tabs>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <span className="text-muted-foreground">加载中...</span>
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 gap-4">
          <History className="size-12 text-muted-foreground" />
          <p className="text-muted-foreground">暂无发布记录</p>
          <p className="text-sm text-muted-foreground">发布内容后会在这里显示记录</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(groupedHistory).map(([date, items]) => (
            <div key={date} className="flex flex-col gap-2">
              <h2 className="text-sm font-medium text-muted-foreground sticky top-0 bg-background py-1">
                {date}
              </h2>
              <div className="flex flex-col gap-2">
                {items.map((item) => {
                  const status = statusConfig[item.status]
                  const platform = PLATFORMS[item.platform as PlatformType]
                  return (
                    <Card key={item.id} className="shadow-none border">
                      <CardHeader className="flex gap-3 pb-0">
                        <div className="flex flex-col flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-md font-semibold line-clamp-1">
                              {item.title || '无标题'}
                            </p>
                            <Chip size="sm" color={status.color} variant="flat">
                              {status.icon}
                              {status.label}
                            </Chip>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Chip size="sm" variant="bordered">
                              {platform?.name || item.platform}
                            </Chip>
                            <span className="text-xs text-muted-foreground">
                              {formatTime(item.publishedAt || item.createdAt)}
                            </span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardBody className="pt-2">
                        <p className="text-sm text-muted-foreground line-clamp-2">{item.content}</p>
                        {item.status === 'failed' && item.errorMessage && (
                          <p className="text-sm text-danger mt-2">错误：{item.errorMessage}</p>
                        )}
                        <div className="flex items-center gap-2 mt-3">
                          {item.platformPostUrl && (
                            <Button
                              size="sm"
                              variant="flat"
                              color="primary"
                              onPress={() => handleOpenPost(item.platformPostUrl!)}
                            >
                              <ExternalLink className="size-4" />
                              查看帖子
                            </Button>
                          )}
                          <div className="flex-1" />
                          <Button
                            size="sm"
                            variant="flat"
                            color="danger"
                            isIconOnly
                            onPress={() => handleDelete(item.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </CardBody>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
