import { useState, useEffect, useCallback } from 'react'
import { FileText, Trash2, Edit, MessageSquare, Video } from 'lucide-react'
import { Button } from '@heroui/react'
import { Card, CardBody, CardHeader, CardFooter } from '@heroui/react'
import { Chip } from '@heroui/react'
import { Tabs, Tab } from '@heroui/react'
import { addToast } from '@heroui/react'
import type { Draft, SyncContentType } from '@shared/types'

interface DraftsPageProps {
  onEditDraft?: (draft: Draft) => void
}

const contentTypeConfig: Record<SyncContentType, { label: string; icon: React.ReactNode; color: 'primary' | 'secondary' | 'success' | 'warning' }> = {
  DYNAMIC: { label: '动态', icon: <MessageSquare className="size-3" />, color: 'primary' },
  VIDEO: { label: '视频', icon: <Video className="size-3" />, color: 'success' },
  ARTICLE: { label: '文章', icon: <FileText className="size-3" />, color: 'warning' },
  PODCAST: { label: '播客', icon: <FileText className="size-3" />, color: 'secondary' }
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`

  return date.toLocaleDateString('zh-CN')
}

export function DraftsPage({ onEditDraft }: DraftsPageProps): React.ReactElement {
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<SyncContentType | 'all'>('all')

  const loadDrafts = useCallback(async () => {
    try {
      setLoading(true)
      const data = await window.api.draft.list(
        selectedType === 'all' ? undefined : selectedType
      )
      setDrafts(data)
    } catch (error) {
      console.error('Failed to load drafts:', error)
      addToast({
        title: '加载失败',
        description: '无法加载草稿列表',
        hideIcon: true
      })
    } finally {
      setLoading(false)
    }
  }, [selectedType])

  useEffect(() => {
    loadDrafts()
  }, [loadDrafts])

  const handleDelete = async (id: string) => {
    try {
      await window.api.draft.delete(id)
      setDrafts((prev) => prev.filter((d) => d.id !== id))
      addToast({
        title: '删除成功',
        description: '草稿已删除',
        hideIcon: true
      })
    } catch (error) {
      console.error('Failed to delete draft:', error)
      addToast({
        title: '删除失败',
        description: '无法删除草稿',
        hideIcon: true
      })
    }
  }

  const handleEdit = (draft: Draft) => {
    onEditDraft?.(draft)
  }

  return (
    <div className="flex flex-col h-full p-4 gap-4 overflow-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">草稿箱</h1>
        <Chip variant="flat">{drafts.length} 篇草稿</Chip>
      </div>

      <Tabs
        selectedKey={selectedType}
        onSelectionChange={(key) => setSelectedType(key as SyncContentType | 'all')}
      >
        <Tab key="all" title="全部" />
        <Tab key="DYNAMIC" title="动态" />
        <Tab key="VIDEO" title="视频" />
        <Tab key="ARTICLE" title="文章" />
      </Tabs>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <span className="text-muted-foreground">加载中...</span>
        </div>
      ) : drafts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 gap-4">
          <FileText className="size-12 text-muted-foreground" />
          <p className="text-muted-foreground">暂无草稿</p>
          <p className="text-sm text-muted-foreground">
            编辑内容时会自动保存为草稿
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drafts.map((draft) => {
            const config = contentTypeConfig[draft.contentType]
            return (
              <Card key={draft.id} className="shadow-none border">
                <CardHeader className="flex gap-3 pb-0">
                  <div className="flex flex-col flex-1">
                    <p className="text-md font-semibold line-clamp-1">
                      {draft.title || '无标题'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Chip size="sm" color={config.color} variant="flat">
                        {config.icon}
                        {config.label}
                      </Chip>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(draft.updatedAt)}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardBody>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {draft.content || '无内容'}
                  </p>
                  {draft.selectedPlatforms && draft.selectedPlatforms.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {draft.selectedPlatforms.slice(0, 3).map((p) => (
                        <Chip key={p} size="sm" variant="bordered">
                          {p}
                        </Chip>
                      ))}
                      {draft.selectedPlatforms.length > 3 && (
                        <Chip size="sm" variant="bordered">
                          +{draft.selectedPlatforms.length - 3}
                        </Chip>
                      )}
                    </div>
                  )}
                </CardBody>
                <CardFooter className="gap-2 pt-0">
                  <Button
                    size="sm"
                    variant="flat"
                    color="primary"
                    onPress={() => handleEdit(draft)}
                    className="flex-1"
                  >
                    <Edit className="size-4" />
                    编辑
                  </Button>
                  <Button
                    size="sm"
                    variant="flat"
                    color="danger"
                    isIconOnly
                    onPress={() => handleDelete(draft.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
