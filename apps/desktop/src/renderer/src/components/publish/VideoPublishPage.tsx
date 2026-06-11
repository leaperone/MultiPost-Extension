import { useState, useCallback, useEffect } from 'react'
import { Button, Card, Input, Textarea, Spinner, addToast } from '@heroui/react'
import { Upload, X, Video, Save } from 'lucide-react'
import type { PlatformType, VideoData, SyncContentData, FileData, Draft } from '../../../../shared/types'
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
  type AccountPublishState
} from './shared'

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
  isPublishing,
  onViewAccount,
  onCancelPublish,
  onRetryAccount,
  onCancelAccount,
  initialDraft,
  onDraftSaved
}: VideoPublishPageProps): React.ReactElement {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [videoFile, setVideoFile] = useState<FileData | null>(null)
  const [coverFile, setCoverFile] = useState<FileData | null>(null)
  const [horizontalCover, setHorizontalCover] = useState<FileData | null>(null)
  const [verticalCover, setVerticalCover] = useState<FileData | null>(null)
  const [isDraggingVideo, setIsDraggingVideo] = useState(false)
  const [autoSubmit, setAutoSubmit] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null)

  // Use account selection hook
  const {
    selectedAccountIds,
    selectedOtherPlatforms,
    selectedPlatforms,
    handleAccountToggle,
    handleOtherPlatformToggle
  } = useAccountSelection('VIDEO')

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

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6 shadow-none border">
        <h2 className="text-lg font-semibold mb-5">发布视频</h2>

        {/* Video Upload Area */}
        <div className="mb-5">
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
              className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
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
              <video src={videoFile.url} controls className="w-full max-h-[300px] bg-black" />
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

        {/* Cover Image Upload */}
        <div className="mb-5">
          <CoverUpload
            label="封面图片"
            hint="（可选）"
            file={coverFile}
            onSelect={setCoverFile}
            onRemove={() => setCoverFile(null)}
            isDisabled={isPublishing}
          />
        </div>

        {/* Per-orientation covers; only some platforms (e.g. 大鱼号) consume them */}
        <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
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

        <div className="mb-5">
          <Input
            label="视频标题"
            placeholder="输入视频标题..."
            value={title}
            onValueChange={setTitle}
            isDisabled={isPublishing}
          />
        </div>

        <div className="mb-5">
          <Textarea
            label="视频描述"
            placeholder="输入视频描述..."
            value={description}
            onValueChange={setDescription}
            minRows={4}
            isDisabled={isPublishing}
          />
        </div>

        <div className="mb-5">
          <TagInput value={tags} onChange={setTags} isDisabled={isPublishing} />
        </div>

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

        <div className="flex gap-3">
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
            onPress={handlePublish}
            isDisabled={!canPublish}
            isLoading={isPublishing}
            spinner={<Spinner size="sm" color="current" />}
          >
            {isPublishing ? '发布中...' : '发布视频'}
          </Button>
        </div>
      </Card>

      <PublishProgressCard
        publishStates={publishStates}
        isPublishing={isPublishing}
        onViewAccount={onViewAccount}
        onCancelPublish={onCancelPublish}
        onRetryAccount={onRetryAccount}
        onCancelAccount={onCancelAccount}
      />
    </div>
  )
}
