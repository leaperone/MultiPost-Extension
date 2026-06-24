import { useState, useCallback, useEffect, useMemo } from 'react'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { toast } from '../ui/sonner'
import { ArrowLeft, ArrowRight, Eraser, Upload, X, Video, Save } from 'lucide-react'
import type { PlatformType, VideoData, SyncContentData, FileData, Draft, PublishGroupSummary } from '../../../../shared/types'
import {
  AccountSelector,
  useAccountSelection,
  PublishModeSelector,
  PublishProgressCard,
  TagInput,
  CoverUpload,
  fileDataFromDrop,
  fileDataFromPath,
  formatFileSize,
  type AccountPublishState,
  type InitialAccountSelection,
  type PublishStep
} from './shared'
import { clearFormCache, loadFormCache, saveFormCache } from '../../lib/formCache'
import { useCreateDraft, useUpdateDraft } from '../../lib/queries'

const VIDEO_FILE_FILTERS = [
  { name: '视频', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'm4v'] }
]

interface VideoPublishPageProps {
  onStartPublish: (
    platforms: PlatformType[],
    contentType: 'VIDEO',
    data: SyncContentData,
    autoSubmit: boolean,
    selectedAccountIds: Set<string>,
    selectedOtherPlatforms?: Set<PlatformType>
  ) => void
  publishStates: AccountPublishState[]
  summary?: PublishGroupSummary | null
  isPublishing: boolean
  onViewAccount?: (accountId: string) => void
  onCancelPublish?: () => void
  onRetryAccount?: (accountId: string) => void
  onCancelAccount?: (accountId: string) => void
  /** 手动确认模式下进度卡「全部发布」的提交通道。 */
  onSubmitAll?: () => void
  /** 全部成功后「清空并开始新内容」需要顺带清掉进度状态。 */
  onClearProgress?: () => void
  initialDraft?: Draft
  onDraftSaved?: () => void
}

export function VideoPublishPage({
  onStartPublish,
  publishStates,
  summary,
  isPublishing,
  onViewAccount,
  onCancelPublish,
  onRetryAccount,
  onCancelAccount,
  onSubmitAll,
  onClearProgress,
  initialDraft,
  onDraftSaved
}: VideoPublishPageProps): React.ReactElement {
  // Auto-saved snapshot restores after accidental close; an explicit draft edit wins over it.
  const [cachedForm] = useState(() => (initialDraft ? null : loadFormCache('VIDEO')))
  const [title, setTitle] = useState(cachedForm?.title || '')
  const [description, setDescription] = useState(cachedForm?.content || '')
  const [tags, setTags] = useState<string[]>(cachedForm?.tags || [])
  const [videoFile, setVideoFile] = useState<FileData | null>(null)
  const [coverFile, setCoverFile] = useState<FileData | null>(null)
  const [horizontalCover, setHorizontalCover] = useState<FileData | null>(null)
  const [verticalCover, setVerticalCover] = useState<FileData | null>(null)
  const [isDraggingVideo, setIsDraggingVideo] = useState(false)
  const [step, setStep] = useState<PublishStep>('compose')
  const [autoSubmit, setAutoSubmit] = useState(cachedForm?.autoSubmit ?? false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(
    cachedForm?.currentDraftId ?? null
  )
  const createDraft = useCreateDraft()
  const updateDraft = useUpdateDraft()

  const initialSelection = useMemo<InitialAccountSelection | undefined>(
    () =>
      cachedForm
        ? {
            accountIds: cachedForm.selectedAccountIds,
            otherPlatforms: cachedForm.selectedOtherPlatforms as PlatformType[] | undefined
          }
        : undefined,
    [cachedForm]
  )

  // Use account selection hook
  const {
    selectedAccountIds,
    selectedOtherPlatforms,
    selectedPlatforms,
    handleAccountToggle,
    handleOtherPlatformToggle
  } = useAccountSelection('VIDEO', initialSelection)

  // Restore cached media; fileDataFromPath stats the file (so stale paths are
  // dropped) and re-registers it on the local-file:// allowlist, which does
  // not survive restarts.
  useEffect(() => {
    if (!cachedForm) return
    let cancelled = false
    // Resolves to true when the cached path exists but its file is gone.
    const restore = async (
      path: string | undefined,
      apply: (file: FileData) => void
    ): Promise<boolean> => {
      if (!path) return false
      const fileData = await fileDataFromPath(path)
      if (!fileData) return true
      if (!cancelled) apply(fileData)
      return false
    }
    void (async () => {
      const droppedFlags = await Promise.all([
        restore(cachedForm.mainMedia, setVideoFile),
        restore(cachedForm.cover, setCoverFile),
        restore(cachedForm.horizontalCover, setHorizontalCover),
        restore(cachedForm.verticalCover, setVerticalCover)
      ])
      const dropped = droppedFlags.filter(Boolean).length
      if (dropped > 0 && !cancelled) {
        toast('部分文件已失效', {
          description: `${dropped} 个文件在磁盘上找不到了，已从恢复的内容中移除。`
        })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Continuously snapshot the form; debounced so typing doesn't thrash localStorage.
  useEffect(() => {
    const timer = setTimeout(() => {
      saveFormCache('VIDEO', {
        title,
        content: description,
        tags,
        mainMedia: videoFile?.path,
        cover: coverFile?.path,
        horizontalCover: horizontalCover?.path,
        verticalCover: verticalCover?.path,
        selectedAccountIds: Array.from(selectedAccountIds),
        selectedOtherPlatforms: Array.from(selectedOtherPlatforms),
        currentDraftId,
        autoSubmit
      })
    }, 600)
    return () => clearTimeout(timer)
  }, [title, description, tags, videoFile, coverFile, horizontalCover, verticalCover, selectedAccountIds, selectedOtherPlatforms, currentDraftId, autoSubmit])

  const handleClearForm = useCallback(() => {
    setTitle('')
    setDescription('')
    setTags([])
    setVideoFile(null)
    setCoverFile(null)
    setHorizontalCover(null)
    setVerticalCover(null)
    setAutoSubmit(false)
    setCurrentDraftId(null)
    clearFormCache('VIDEO')
    toast('已清空', { description: '表单内容与自动缓存都清掉了，可以开始新视频。' })
  }, [])

  // Load initial draft data; media files are restored from their saved paths
  useEffect(() => {
    if (!initialDraft) return
    setTitle(initialDraft.title || '')
    setDescription(initialDraft.content || '')
    setTags(initialDraft.tags || [])
    setCurrentDraftId(initialDraft.id)

    let cancelled = false
    const restoreMedia = async (): Promise<void> => {
      if (initialDraft.video) {
        const fileData = await fileDataFromPath(initialDraft.video)
        if (fileData && !cancelled) setVideoFile(fileData)
      }
      if (initialDraft.cover) {
        const fileData = await fileDataFromPath(initialDraft.cover)
        if (fileData && !cancelled) setCoverFile(fileData)
      }
    }
    void restoreMedia()
    return () => {
      cancelled = true
    }
  }, [initialDraft])

  // Video file handling — always resolved to a local path
  const handlePickVideo = useCallback(async () => {
    if (isPublishing) return
    try {
      const [filePath] = await window.api.app.selectFile({ filters: VIDEO_FILE_FILTERS })
      if (!filePath) return
      const fileData = await fileDataFromPath(filePath)
      if (fileData) {
        setVideoFile(fileData)
      } else {
        toast('这个视频读不出来', { description: '确认文件还在原位，重新选一次。' })
      }
    } catch (error) {
      console.error('Failed to pick video:', error)
      toast.error('选视频出错了', { description: '再试一次。' })
    }
  }, [isPublishing])

  const handleVideoDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setIsDraggingVideo(false)
      if (isPublishing) return
      const file = e.dataTransfer.files[0]
      if (!file) return
      const fileData = await fileDataFromDrop(file)
      if (fileData) {
        setVideoFile(fileData)
      } else {
        toast('没拿到这个文件的本地路径', {
          description: '换成点击上传区域、从本地选择视频文件即可。'
        })
      }
    },
    [isPublishing]
  )

  const handlePublish = useCallback(() => {
    if (selectedPlatforms.size === 0 || !title.trim() || !videoFile) return

    const videoData: VideoData = {
      title: title.trim(),
      content: description.trim(),
      video: videoFile,
      cover: coverFile || undefined,
      horizontalCover: horizontalCover || undefined,
      verticalCover: verticalCover || undefined,
      tags
    }

    onStartPublish(
      Array.from(selectedPlatforms),
      'VIDEO',
      videoData,
      autoSubmit,
      selectedAccountIds,
      selectedOtherPlatforms
    )
  }, [selectedAccountIds, selectedOtherPlatforms, selectedPlatforms, title, description, videoFile, coverFile, horizontalCover, verticalCover, tags, autoSubmit, onStartPublish])

  const handleSaveDraft = useCallback(async () => {
    if (!title.trim()) {
      toast('还没有标题', { description: '先给视频起个标题，再点保存草稿。' })
      return
    }

    setIsSavingDraft(true)
    try {
      const draftData = {
        title: title.trim(),
        contentType: 'VIDEO' as const,
        content: description.trim(),
        tags,
        video: videoFile?.path,
        cover: coverFile?.path,
        selectedPlatforms: Array.from(selectedPlatforms)
      }

      if (currentDraftId) {
        await updateDraft.mutateAsync({ id: currentDraftId, data: draftData })
      } else {
        const newDraft = await createDraft.mutateAsync(draftData)
        setCurrentDraftId(newDraft.id)
      }

      toast('已保存草稿')
      onDraftSaved?.()
    } catch (error) {
      console.error('Failed to save draft:', error)
      toast.error('草稿没存上', {
        description: '内容还在表单里，稍后再点一次保存草稿。'
      })
    } finally {
      setIsSavingDraft(false)
    }
  }, [title, description, tags, videoFile, coverFile, selectedPlatforms, currentDraftId, onDraftSaved, createDraft, updateDraft])

  const isContentValid = title.trim().length > 0 && videoFile !== null
  const hasSelectedTargets = selectedAccountIds.size > 0 || selectedOtherPlatforms.size > 0
  const canPublish = hasSelectedTargets && isContentValid && !isPublishing
  const canSaveDraft = title.trim().length > 0 && !isPublishing && !isSavingDraft

  // 全部发布成功后的「清空并开始新内容」：清表单 + 清进度，回到第 1 步
  const handleStartNew = useCallback(() => {
    handleClearForm()
    onClearProgress?.()
    setStep('compose')
  }, [handleClearForm, onClearProgress])

  // 第 2 步 Cmd/Ctrl+Enter 触发发布(按钮禁用时不触发)
  useEffect(() => {
    if (step !== 'configure') return
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && canPublish) {
        e.preventDefault()
        handlePublish()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [step, canPublish, handlePublish])

  // 第 1 步 · 创作：大上传区 + 标题/描述
  if (step === 'compose') {
    return (
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6">
        {/* 页面级标题直接坐在画布上，不进卡片 */}
        <div className="flex items-end justify-between">
          <h2 className="text-xl font-semibold">发布视频</h2>
          <span className="text-xs text-muted-foreground">第 1 步 · 上传与编辑</span>
        </div>

        <Card className="flex flex-col gap-5 p-6">
          {/* 宽屏双栏：左边视频，右边标题/描述；窄窗落回单列 */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {/* Video Upload Area */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-muted-foreground">视频文件</label>
              {!videoFile ? (
                <div
                  onClick={handlePickVideo}
                  onDrop={handleVideoDrop}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setIsDraggingVideo(true)
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault()
                    setIsDraggingVideo(false)
                  }}
                  className={`flex min-h-[40vh] flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border p-8 cursor-pointer transition-colors ${
                    isDraggingVideo ? 'bg-foreground/[0.05]' : 'bg-foreground/[0.02] hover:bg-foreground/[0.05]'
                  } ${isPublishing ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <Upload className="size-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">点击或拖拽视频文件到此处上传</p>
                  <p className="text-xs text-muted-foreground">支持 MP4, MOV, AVI 等格式</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/5">
                  <video src={videoFile.url} controls className="w-full max-h-[44vh] bg-black" />
                  <div className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Video className="size-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate">{videoFile.name}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatFileSize(videoFile.size || 0)}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setVideoFile(null)}
                      disabled={isPublishing}
                      aria-label="移除视频"
                      className="flex-shrink-0"
                    >
                      <X />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-5">
              <Input
                label="视频标题"
                placeholder="输入视频标题..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isPublishing}
              />

              <Textarea
                label="视频描述"
                placeholder="输入视频描述..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                disabled={isPublishing}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="ghost" size="lg" onClick={handleClearForm} disabled={isPublishing}>
              <Eraser />
              清空
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleSaveDraft}
              disabled={!canSaveDraft}
              isLoading={isSavingDraft}
            >
              {!isSavingDraft && <Save />}
              保存草稿
            </Button>
            <Button
              className="flex-1"
              size="lg"
              onClick={() => setStep('configure')}
              disabled={!isContentValid}
            >
              下一步
              <ArrowRight />
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // 第 2 步 · 发布：左侧发布信息，右侧内容预览
  return (
    <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStep('compose')} disabled={isPublishing}>
          <ArrowLeft />
          上一步
        </Button>
        <span className="text-xs text-muted-foreground">第 2 步 · 发布设置</span>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        <Card className="flex flex-col gap-5 p-6">
          <h2 className="text-base font-semibold">发布信息</h2>

          <CoverUpload
            label="封面图片"
            hint="（可选）"
            file={coverFile}
            onSelect={setCoverFile}
            onRemove={() => setCoverFile(null)}
            isDisabled={isPublishing}
          />

          {/* Per-orientation covers; only some platforms (e.g. 大鱼号) consume them */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <CoverUpload
              label="横版封面"
              hint="（可选，部分平台使用）"
              file={horizontalCover}
              onSelect={setHorizontalCover}
              onRemove={() => setHorizontalCover(null)}
              isDisabled={isPublishing}
            />
            <CoverUpload
              label="竖版封面"
              hint="（可选，部分平台使用）"
              file={verticalCover}
              onSelect={setVerticalCover}
              onRemove={() => setVerticalCover(null)}
              isDisabled={isPublishing}
            />
          </div>

          <TagInput value={tags} onChange={setTags} isDisabled={isPublishing} />

          <AccountSelector
            contentType="VIDEO"
            selectedAccountIds={selectedAccountIds}
            onAccountToggle={handleAccountToggle}
            selectedOtherPlatforms={selectedOtherPlatforms}
            onOtherPlatformToggle={handleOtherPlatformToggle}
            isDisabled={isPublishing}
          />

          <PublishModeSelector
            autoSubmit={autoSubmit}
            onChange={setAutoSubmit}
            disabled={isPublishing}
          />

          <Button size="lg" onClick={handlePublish} disabled={!canPublish} isLoading={isPublishing}>
            {isPublishing
              ? autoSubmit
                ? '发布中…'
                : '填充中…'
              : autoSubmit
                ? '发布'
                : '填充到各平台'}
          </Button>
        </Card>

        <Card className="flex flex-col gap-4 p-6 xl:sticky xl:top-0">
          <span className="text-xs font-medium text-muted-foreground">内容预览</span>
          {videoFile && (
            <video src={videoFile.url} controls className="w-full max-h-[40vh] rounded-lg bg-black" />
          )}
          <h3 className="text-xl font-semibold tracking-tight">{title || '未命名视频'}</h3>
          {description && (
            <p className="max-h-[24vh] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </Card>
      </div>

      <PublishProgressCard
        publishStates={publishStates}
        summary={summary}
        isPublishing={isPublishing}
        onViewAccount={onViewAccount}
        onCancelPublish={onCancelPublish}
        onRetryAccount={onRetryAccount}
        onCancelAccount={onCancelAccount}
        onSubmitAll={onSubmitAll}
        onStartNew={handleStartNew}
      />
    </div>
  )
}
