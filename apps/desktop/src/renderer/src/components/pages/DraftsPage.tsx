import { useState } from 'react'
import { FileText, Trash2, Edit } from 'lucide-react'
import { CONTENT_TYPE_LABELS } from '@shared/constants'
import type { Draft, SyncContentType } from '@shared/types'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Card } from '../ui/card'
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs'
import { Tooltip } from '../ui/tooltip'
import { ConfirmDialog } from '../ui/confirm-dialog'
import { Spinner } from '../ui/spinner'
import { toast } from '../ui/sonner'
import { useDeleteDraft, useDrafts } from '../../lib/queries'

interface DraftsPageProps {
  onEditDraft?: (draft: Draft) => void
}

const TYPE_TABS: Array<{ key: SyncContentType | 'all'; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'DYNAMIC', label: CONTENT_TYPE_LABELS.DYNAMIC },
  { key: 'VIDEO', label: CONTENT_TYPE_LABELS.VIDEO },
  { key: 'ARTICLE', label: CONTENT_TYPE_LABELS.ARTICLE },
  { key: 'PODCAST', label: CONTENT_TYPE_LABELS.PODCAST }
]

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
  const [selectedType, setSelectedType] = useState<SyncContentType | 'all'>('all')
  const [draftToDelete, setDraftToDelete] = useState<Draft | null>(null)
  const draftsQuery = useDrafts(selectedType === 'all' ? undefined : selectedType)
  const deleteDraft = useDeleteDraft()
  const drafts = draftsQuery.data ?? []
  const loading = draftsQuery.isPending

  const handleDelete = async (id: string) => {
    try {
      await deleteDraft.mutateAsync(id)
      toast('草稿已删除')
    } catch (error) {
      console.error('Failed to delete draft:', error)
      toast.error('无法删除草稿', { description: '请稍后重试' })
    }
  }

  const handleEdit = (draft: Draft) => {
    onEditDraft?.(draft)
  }

  const isFiltered = selectedType !== 'all'

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-4 xl:max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">草稿箱</h1>
        <span className="text-sm text-muted-foreground">{drafts.length} 篇草稿</span>
      </div>

      <Tabs
        value={selectedType}
        onValueChange={(value) => setSelectedType(value as SyncContentType | 'all')}
      >
        <TabsList>
          {TYPE_TABS.map((tab) => (
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
      ) : drafts.length === 0 ? (
        <div className="flex h-56 flex-col items-center justify-center gap-3 rounded-xl bg-muted">
          <div className="flex size-14 items-center justify-center rounded-full bg-background text-muted-foreground">
            <FileText className="size-7" />
          </div>
          <p className="font-medium">
            {isFiltered ? '这个类型下没有草稿' : '还没有草稿'}
          </p>
          <p className="text-sm text-muted-foreground">
            {isFiltered ? '试试切换到全部' : '点「保存草稿」后，内容会出现在这里'}
          </p>
        </div>
      ) : (
        <Card className="divide-y divide-border/60 overflow-hidden">
          {drafts.map((draft) => (
            <div
              key={draft.id}
              className="flex flex-wrap items-start gap-x-3 gap-y-2 px-4 py-3 transition-colors hover:bg-foreground/[0.03]"
            >
              <div className="flex min-w-0 flex-1 basis-56 flex-col gap-1">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-medium">
                    {draft.title || '无标题'}
                  </span>
                  <Badge size="sm" className="shrink-0">
                    {CONTENT_TYPE_LABELS[draft.contentType] || draft.contentType}
                  </Badge>
                </div>
                <p className="line-clamp-1 text-xs text-muted-foreground">
                  {draft.content || '无内容'}
                </p>
                {draft.selectedPlatforms && draft.selectedPlatforms.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {draft.selectedPlatforms.slice(0, 3).map((p) => (
                      <Badge key={p} size="sm">
                        {p}
                      </Badge>
                    ))}
                    {draft.selectedPlatforms.length > 3 && (
                      <Badge size="sm">
                        +{draft.selectedPlatforms.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-3 pt-0.5">
                <span className="text-xs text-muted-foreground">
                  {formatTime(draft.updatedAt)}
                </span>
                <Button size="sm" variant="secondary" onClick={() => handleEdit(draft)}>
                  <Edit />
                  编辑
                </Button>
                <Tooltip content="删除草稿">
                  <Button
                    size="icon-sm"
                    variant="destructive-ghost"
                    aria-label="删除草稿"
                    onClick={() => setDraftToDelete(draft)}
                  >
                    <Trash2 />
                  </Button>
                </Tooltip>
              </div>
            </div>
          ))}
        </Card>
      )}

      <ConfirmDialog
        open={draftToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setDraftToDelete(null)
        }}
        title={`删除草稿「${draftToDelete?.title || '无标题'}」？`}
        description="删除后无法恢复。"
        confirmText="删除"
        onConfirm={async () => {
          if (draftToDelete) await handleDelete(draftToDelete.id)
        }}
      />
    </div>
  )
}
