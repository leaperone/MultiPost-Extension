import { useState, useCallback, useEffect, useMemo } from 'react'
import { Button, Card, Input, Textarea, Spinner, addToast } from '@heroui/react'
import { ArrowLeft, ArrowRight, Eraser, Upload, X, Video, Save } from 'lucide-react'
import type { PlatformType, VideoData, SyncContentData, FileData, Draft, PublishGroupSummary } from '../../../../shared/types'
import {
  AccountSelector,
  useAccountSelection,
  AutoSubmitToggle,
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
        addToast({
          title: '部分文件已失效',
          description: `${dropped} 个文件已不存在，已从恢复的内容中移除`,
          hideIcon: true
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
    addToast({
      title: '已清空',
      description: '表单内容与自动缓存已清空',
      hideIcon: true
    })
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
    const [filePath] = await window.api.app.selectFile({ filters: VIDEO_FILE_FILTERS })
    if (!filePath) return
    const fileData = await fileDataFromPath(filePath)
    if (fileData) setVideoFile(fileData)
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
        addToast({
          title: '无法读取文件',
          description: '请点击上传区域选择本地视频文件',
          hideIcon: true
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
      addToast({
        title: '保存失败',
        description: '请输入标题后再保存',
        hideIcon: true
      })
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
        await window.api.draft.update(currentDraftId, draftData)
      } else {
        const newDraft = await window.api.draft.create(draftData)
        setCurrentDraftId(newDraft.id)
      }

      addToast({
        title: '保存成功',
        description: '草稿已保存',
        hideIcon: true
      })
      onDraftSaved?.()
    } catch (error) {
      console.error('Failed to save draft:', error)
      addToast({
        title: '保存失败',
        description: '无法保存草稿',
        hideIcon: true
      })
    } finally {
      setIsSavingDraft(false)
    }
  }, [title, description, tags, videoFile, coverFile, selectedPlatforms, currentDraftId, onDraftSaved])

  const isContentValid = title.trim().length > 0 && videoFile !== null
  const hasSelectedTargets = selectedAccountIds.size > 0 || selectedOtherPlatforms.size > 0
  const canPublish = hasSelectedTargets && isContentValid && !isPublishing
  const canSaveDraft = title.trim().length > 0 && !isPublishing && !isSavingDraft

  // 第 1 步 · 创作：大上传区 + 标题/描述
  if (step === 'compose') {
    return (
      <div className="flex flex-col gap-6">
        <Card className="flex flex-col gap-5 p-6 shadow-none border">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">发布视频</h2>
            <span className="text-xs text-muted-foreground">第 1 步 · 上传与编辑</span>
          </div>

          {/* Video Upload Area */}
          <div>
            <label className="block mb-2 text-sm font-medium">视频文件</label>
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
                className={`flex min-h-[40vh] flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  isDraggingVideo
                    ? 'border-primary bg-primary/5'
                    : 'border-default-300 hover:border-primary/50'
                } ${isPublishing ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <Upload className="size-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-1">
                  点击或拖拽视频文件到此处上传
                </p>
                <p className="text-xs text-muted-foreground">支持 MP4, MOV, AVI 等格式</p>
              </div>
            ) : (
              <div className="relative border rounded-lg overflow-hidden">
                <video src={videoFile.url} controls className="w-full max-h-[44vh] bg-black" />
                <div className="p-3 bg-muted/50 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Video className="size-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm truncate">{videoFile.name}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {formatFileSize(videoFile.size || 0)}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    isIconOnly
                    onPress={() => setVideoFile(null)}
                    isDisabled={isPublishing}
                    className="flex-shrink-0"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Input
            label="视频标题"
            placeholder="输入视频标题..."
            value={title}
            onValueChange={setTitle}
            isDisabled={isPublishing}
          />

          <Textarea
            label="视频描述"
            placeholder="输入视频描述..."
            value={description}
            onValueChange={setDescription}
            minRows={6}
            isDisabled={isPublishing}
          />

          <div className="flex gap-3">
            <Button
              variant="light"
              size="lg"
              onPress={handleClearForm}
              isDisabled={isPublishing}
              startContent={<Eraser className="size-4" />}
            >
              清空
            </Button>
            <Button
              variant="bordered"
              size="lg"
              onPress={handleSaveDraft}
              isDisabled={!canSaveDraft}
              isLoading={isSavingDraft}
              startContent={!isSavingDraft && <Save className="size-4" />}
            >
              保存草稿
            </Button>
            <Button
              color="primary"
              variant="solid"
              className="flex-1"
              size="lg"
              onPress={() => setStep('configure')}
              isDisabled={!isContentValid}
              endContent={<ArrowRight className="size-4" />}
            >
              下一步
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // 第 2 步 · 发布：左侧发布信息，右侧内容预览
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Button
          variant="light"
          onPress={() => setStep('compose')}
          isDisabled={isPublishing}
          startContent={<ArrowLeft className="size-4" />}
        >
          上一步
        </Button>
        <span className="text-xs text-muted-foreground">第 2 步 · 发布设置</span>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-5 p-6 shadow-none border">
          <h2 className="text-lg font-semibold">发布信息</h2>

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

          <AutoSubmitToggle
            isSelected={autoSubmit}
            onValueChange={setAutoSubmit}
            isDisabled={isPublishing}
          />

          <Button
            color="primary"
            variant="solid"
            size="lg"
            onPress={handlePublish}
            isDisabled={!canPublish}
            isLoading={isPublishing}
            spinner={<Spinner size="sm" color="current" />}
          >
            {isPublishing ? '发布中...' : '发布视频'}
          </Button>
        </Card>

        <Card className="flex flex-col gap-4 p-6 shadow-none border lg:sticky lg:top-0">
          <span className="text-sm font-medium text-muted-foreground">内容预览</span>
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
      />
    </div>
  )
}
