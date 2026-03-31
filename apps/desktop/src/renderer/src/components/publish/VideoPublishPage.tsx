import { useState, useCallback, useRef, useEffect } from 'react'
import { Button, Card, Input, Textarea, Spinner, addToast } from '@heroui/react'
import { Upload, X, Video, Image, Save } from 'lucide-react'
import type { PlatformType, VideoData, SyncContentData, FileData, Draft } from '../../../../shared/types'
import {
  AccountSelector,
  useAccountSelection,
  AutoSubmitToggle,
  PublishProgressCard,
  formatFileSize,
  type AccountPublishState
} from './shared'

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
  const [tags, setTags] = useState('')
  const [videoFile, setVideoFile] = useState<FileData | null>(null)
  const [coverFile, setCoverFile] = useState<FileData | null>(null)
  const [isDraggingVideo, setIsDraggingVideo] = useState(false)
  const [autoSubmit, setAutoSubmit] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null)

  const videoInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  // Use account selection hook
  const {
    selectedAccountIds,
    selectedOtherPlatforms,
    selectedPlatforms,
    handleAccountToggle,
    handleOtherPlatformToggle
  } = useAccountSelection('VIDEO')

  // Load initial draft data
  useEffect(() => {
    if (initialDraft) {
      setTitle(initialDraft.title || '')
      setDescription(initialDraft.content || '')
      setTags(initialDraft.tags?.join(', ') || '')
      setCurrentDraftId(initialDraft.id)
    }
  }, [initialDraft])

  // Video file handling
  const handleVideoFileSelect = useCallback(
    (file: File) => {
      if (!file.type.startsWith('video/')) {
        console.error('Not a video file')
        return
      }
      const fileData: FileData = {
        name: file.name,
        url: URL.createObjectURL(file),
        type: file.type,
        size: file.size
      }
      if (videoFile?.url) {
        URL.revokeObjectURL(videoFile.url)
      }
      setVideoFile(fileData)
    },
    [videoFile]
  )

  const handleVideoInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleVideoFileSelect(file)
      }
    },
    [handleVideoFileSelect]
  )

  const handleVideoDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDraggingVideo(false)
      const file = e.dataTransfer.files[0]
      if (file) {
        handleVideoFileSelect(file)
      }
    },
    [handleVideoFileSelect]
  )

  const handleVideoDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingVideo(true)
  }, [])

  const handleVideoDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingVideo(false)
  }, [])

  const handleRemoveVideo = useCallback(() => {
    if (videoFile?.url) {
      URL.revokeObjectURL(videoFile.url)
    }
    setVideoFile(null)
    if (videoInputRef.current) {
      videoInputRef.current.value = ''
    }
  }, [videoFile])

  // Cover image handling
  const handleCoverSelect = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        console.error('Not an image file')
        return
      }
      const fileData: FileData = {
        name: file.name,
        url: URL.createObjectURL(file),
        type: file.type,
        size: file.size
      }
      if (coverFile?.url) {
        URL.revokeObjectURL(coverFile.url)
      }
      setCoverFile(fileData)
    },
    [coverFile]
  )

  const handleCoverInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleCoverSelect(file)
      }
    },
    [handleCoverSelect]
  )

  const handleRemoveCover = useCallback(() => {
    if (coverFile?.url) {
      URL.revokeObjectURL(coverFile.url)
    }
    setCoverFile(null)
    if (coverInputRef.current) {
      coverInputRef.current.value = ''
    }
  }, [coverFile])

  const handlePublish = useCallback(() => {
    if (selectedPlatforms.size === 0 || !title.trim() || !videoFile) return

    const videoData: VideoData = {
      title: title.trim(),
      content: description.trim(),
      video: videoFile,
      cover: coverFile || undefined,
      tags: tags
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter(Boolean)
    }

    onStartPublish(
      Array.from(selectedPlatforms),
      'VIDEO',
      videoData,
      autoSubmit,
      selectedAccountIds,
      selectedOtherPlatforms
    )
  }, [selectedAccountIds, selectedOtherPlatforms, selectedPlatforms, title, description, videoFile, coverFile, tags, autoSubmit, onStartPublish])

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
        tags: tags
          .split(/[,，]/)
          .map((t) => t.trim())
          .filter(Boolean),
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
        description: '草稿已保存（视频文件需重新选择）',
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
  }, [title, description, tags, selectedPlatforms, currentDraftId, onDraftSaved])

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
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            onChange={handleVideoInputChange}
            className="hidden"
            disabled={isPublishing}
          />
          {!videoFile ? (
            <div
              onClick={() => !isPublishing && videoInputRef.current?.click()}
              onDrop={handleVideoDrop}
              onDragOver={handleVideoDragOver}
              onDragLeave={handleVideoDragLeave}
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
                  onPress={handleRemoveVideo}
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
          <label className="block mb-2 text-sm font-medium">
            封面图片 <span className="text-muted-foreground font-normal">（可选）</span>
          </label>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            onChange={handleCoverInputChange}
            className="hidden"
            disabled={isPublishing}
          />
          {!coverFile ? (
            <div
              onClick={() => !isPublishing && coverInputRef.current?.click()}
              className={`flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors border-default-300 hover:border-primary/50 ${isPublishing ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <Image className="size-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">点击上传封面图片</span>
            </div>
          ) : (
            <div className="relative inline-block">
              <img
                src={coverFile.url}
                alt="Cover"
                className="h-24 w-auto rounded-lg object-cover"
              />
              <Button
                variant="solid"
                size="sm"
                isIconOnly
                onPress={handleRemoveCover}
                isDisabled={isPublishing}
                className="absolute -top-2 -right-2 size-6 min-w-0 rounded-full bg-danger"
              >
                <X className="size-3" />
              </Button>
            </div>
          )}
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
          <Input
            label="标签（用逗号分隔）"
            placeholder="标签1, 标签2, 标签3"
            value={tags}
            onValueChange={setTags}
            isDisabled={isPublishing}
          />
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
