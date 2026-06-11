import { useState, useCallback, useEffect } from 'react'
import {
  Button,
  Card,
  Image,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  Textarea,
  Spinner,
  addToast
} from '@heroui/react'
import { ChevronLeft, ChevronRight, ImagePlus, Play, Save, Video, X } from 'lucide-react'
import type { PlatformType, DynamicData, FileData, SyncContentData, Draft } from '../../../../shared/types'
import { createLocalFileUrl } from '../../../../shared/types'
import {
  AccountSelector,
  useAccountSelection,
  AutoSubmitToggle,
  PublishProgressCard,
  TagInput,
  type AccountPublishState
} from './shared'

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic', 'avif']
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'm4v']
const MAX_IMAGES = 20
const MAX_VIDEOS = 9

interface LocalMedia extends FileData {
  /** Filesystem path; what fill scripts ultimately need (via local-file://). */
  path: string
}

function mediaFromPath(path: string, kind: 'image' | 'video'): LocalMedia {
  const name = path.split(/[\\/]/).pop() || path
  const ext = (name.split('.').pop() || '').toLowerCase()
  const fallbackExt = kind === 'image' ? 'png' : 'mp4'
  return {
    path,
    name,
    url: createLocalFileUrl(path),
    type: `${kind}/${ext === 'jpg' ? 'jpeg' : ext || fallbackExt}`
  }
}

function hasExtension(path: string, extensions: string[]): boolean {
  const ext = (path.split('.').pop() || '').toLowerCase()
  return extensions.includes(ext)
}

function isImagePath(path: string): boolean {
  return hasExtension(path, IMAGE_EXTENSIONS)
}

function isVideoPath(path: string): boolean {
  return hasExtension(path, VIDEO_EXTENSIONS)
}

function appendMedia(
  prev: LocalMedia[],
  paths: string[],
  kind: 'image' | 'video',
  max: number
): LocalMedia[] {
  const existing = new Set(prev.map((media) => media.path))
  const next = [...prev]
  for (const path of paths) {
    if (!existing.has(path) && next.length < max) {
      existing.add(path)
      next.push(mediaFromPath(path, kind))
    }
  }
  return next
}

interface DynamicPublishPageProps {
  onStartPublish: (
    platforms: PlatformType[],
    contentType: 'DYNAMIC',
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

export function DynamicPublishPage({
  onStartPublish,
  publishStates,
  isPublishing,
  onViewAccount,
  onCancelPublish,
  onRetryAccount,
  onCancelAccount,
  initialDraft,
  onDraftSaved
}: DynamicPublishPageProps): React.ReactElement {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [images, setImages] = useState<LocalMedia[]>([])
  const [videos, setVideos] = useState<LocalMedia[]>([])
  const [isDraggingMedia, setIsDraggingMedia] = useState(false)
  const [previewImage, setPreviewImage] = useState<LocalMedia | null>(null)
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
  } = useAccountSelection('DYNAMIC')

  // Load initial draft data
  useEffect(() => {
    if (initialDraft) {
      setTitle(initialDraft.title || '')
      setContent(initialDraft.content || '')
      setTags(initialDraft.tags || [])
      setImages(
        (initialDraft.images || []).filter(isImagePath).map((path) => mediaFromPath(path, 'image'))
      )
      setVideos(
        (initialDraft.videos || []).filter(isVideoPath).map((path) => mediaFromPath(path, 'video'))
      )
      setCurrentDraftId(initialDraft.id)
    }
  }, [initialDraft])

  const addMediaPaths = useCallback((paths: string[]) => {
    const imagePaths = paths.filter(isImagePath)
    const videoPaths = paths.filter(isVideoPath)
    if (imagePaths.length > 0) {
      setImages((prev) => appendMedia(prev, imagePaths, 'image', MAX_IMAGES))
    }
    if (videoPaths.length > 0) {
      setVideos((prev) => appendMedia(prev, videoPaths, 'video', MAX_VIDEOS))
    }
  }, [])

  const handlePickImages = useCallback(async () => {
    try {
      const paths = await window.api.app.selectFile({
        filters: [{ name: '图片', extensions: IMAGE_EXTENSIONS }],
        multiple: true
      })
      if (paths?.length) {
        addMediaPaths(paths)
      }
    } catch (error) {
      console.error('Failed to select images:', error)
    }
  }, [addMediaPaths])

  const handlePickVideos = useCallback(async () => {
    try {
      const paths = await window.api.app.selectFile({
        filters: [{ name: '视频', extensions: VIDEO_EXTENSIONS }],
        multiple: true
      })
      if (paths?.length) {
        addMediaPaths(paths)
      }
    } catch (error) {
      console.error('Failed to select videos:', error)
    }
  }, [addMediaPaths])

  const handleMediaDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDraggingMedia(false)
      const paths = Array.from(e.dataTransfer.files)
        .map((file) => {
          try {
            return window.api.app.getPathForFile(file)
          } catch {
            return ''
          }
        })
        .filter(Boolean)
      addMediaPaths(paths)
    },
    [addMediaPaths]
  )

  // Pasted screenshots have no filesystem path, so the bitmap goes through the
  // main process to land as a temp file the fill scripts can actually read.
  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files || [])
      if (files.length === 0) return

      const paths = files
        .map((file) => {
          try {
            return window.api.app.getPathForFile(file)
          } catch {
            return ''
          }
        })
        .filter(Boolean)

      if (paths.length > 0) {
        addMediaPaths(paths)
        return
      }

      try {
        const savedPath = await window.api.app.saveClipboardImage()
        if (savedPath) {
          addMediaPaths([savedPath])
        }
      } catch (error) {
        console.error('Failed to save clipboard image:', error)
      }
    },
    [addMediaPaths]
  )

  const handleRemoveImage = useCallback((path: string) => {
    setImages((prev) => prev.filter((img) => img.path !== path))
  }, [])

  const handleRemoveVideo = useCallback((path: string) => {
    setVideos((prev) => prev.filter((video) => video.path !== path))
  }, [])

  const handleMoveImage = useCallback((index: number, direction: -1 | 1) => {
    setImages((prev) => {
      const target = index + direction
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }, [])

  const handlePublish = useCallback(() => {
    if (selectedPlatforms.size === 0 || !content.trim()) return

    const dynamicData: DynamicData = {
      title: title.trim(),
      content: content.trim(),
      images: images.map(({ url, name, type, size }) => ({ url, name, type, size })),
      videos: videos.map(({ url, name, type, size }) => ({ url, name, type, size })),
      tags: tags.length > 0 ? tags : undefined
    }

    onStartPublish(
      Array.from(selectedPlatforms),
      'DYNAMIC',
      dynamicData,
      autoSubmit,
      selectedAccountIds,
      selectedOtherPlatforms
    )
  }, [selectedAccountIds, selectedOtherPlatforms, selectedPlatforms, title, content, tags, images, videos, autoSubmit, onStartPublish])

  const handleSaveDraft = useCallback(async () => {
    if (!content.trim()) {
      addToast({
        title: '保存失败',
        description: '请输入内容后再保存',
        hideIcon: true
      })
      return
    }

    setIsSavingDraft(true)
    try {
      const draftData = {
        title: title.trim() || '未命名动态',
        contentType: 'DYNAMIC' as const,
        content: content.trim(),
        images: images.map((img) => img.path),
        videos: videos.map((video) => video.path),
        tags,
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
  }, [title, content, tags, images, videos, selectedPlatforms, currentDraftId, onDraftSaved])

  const isContentValid = content.trim().length > 0
  const hasSelectedTargets = selectedAccountIds.size > 0 || selectedOtherPlatforms.size > 0
  const canPublish = hasSelectedTargets && isContentValid && !isPublishing
  const canSaveDraft = isContentValid && !isPublishing && !isSavingDraft
  const totalCharCount = title.length + content.length

  return (
    <div className="flex flex-col gap-6" onPaste={handlePaste}>
      <Card className="p-6 shadow-none border">
        <h2 className="text-lg font-semibold mb-5">发布动态</h2>

        <div className="mb-5">
          <Input
            label="标题（可选）"
            placeholder="输入标题..."
            value={title}
            onValueChange={setTitle}
            isDisabled={isPublishing}
          />
        </div>

        <div className="mb-5">
          <Textarea
            label="内容"
            placeholder="输入要发布的内容..."
            value={content}
            onValueChange={setContent}
            minRows={8}
            isDisabled={isPublishing}
          />
          <p className="mt-1 text-right text-xs text-foreground/40">{totalCharCount} 字符</p>
        </div>

        <div className="mb-5">
          <TagInput value={tags} onChange={setTags} isDisabled={isPublishing} />
        </div>

        {/* 媒体上传区：图片 + 视频共用一个拖拽区域 */}
        <div
          className={`mb-5 rounded-xl transition-colors ${isDraggingMedia ? 'bg-foreground/[0.04]' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDraggingMedia(true)
          }}
          onDragLeave={(e) => {
            e.preventDefault()
            setIsDraggingMedia(false)
          }}
          onDrop={handleMediaDrop}
        >
          <p className="mb-2 text-sm text-foreground/60">
            图片（{images.length}/{MAX_IMAGES}）
          </p>
          <div className="flex flex-wrap gap-3">
            {images.map((img, index) => (
              <div
                key={img.path}
                className="group relative aspect-square w-[100px] overflow-hidden rounded-2xl border bg-default-100"
              >
                <button
                  type="button"
                  className="block cursor-zoom-in"
                  onClick={() => setPreviewImage(img)}
                  title="查看大图"
                >
                  <Image
                    src={img.url}
                    alt={img.name}
                    width={100}
                    height={100}
                    radius="none"
                    className="size-[100px] object-cover"
                  />
                </button>
                <span className="absolute bottom-1 left-1 z-20 rounded bg-black/50 px-1 text-[10px] text-white">
                  {index + 1}
                </span>
                <div className="absolute bottom-1 right-1 z-20 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    className="rounded-full bg-black/50 p-1 text-white hover:bg-black/70 disabled:opacity-40"
                    onClick={() => handleMoveImage(index, -1)}
                    disabled={index === 0}
                    title="前移"
                  >
                    <ChevronLeft className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    className="rounded-full bg-black/50 p-1 text-white hover:bg-black/70 disabled:opacity-40"
                    onClick={() => handleMoveImage(index, 1)}
                    disabled={index === images.length - 1}
                    title="后移"
                  >
                    <ChevronRight className="size-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  className="absolute right-1 top-1 z-20 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
                  onClick={() => handleRemoveImage(img.path)}
                  title="移除图片"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}

            {images.length < MAX_IMAGES && (
              <button
                type="button"
                disabled={isPublishing}
                onClick={handlePickImages}
                className="flex aspect-square w-[100px] cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-dashed text-foreground/50 transition-colors hover:bg-foreground/[0.04] hover:text-foreground/80"
              >
                <ImagePlus className="size-5" />
                <span className="text-xs">添加图片</span>
              </button>
            )}
          </div>

          <p className="mb-2 mt-4 text-sm text-foreground/60">
            视频（{videos.length}/{MAX_VIDEOS}）
          </p>
          <div className="flex flex-wrap gap-3">
            {videos.map((video) => (
              <div
                key={video.path}
                className="group relative aspect-square w-[100px] overflow-hidden rounded-2xl border bg-default-100"
              >
                <video src={video.url} muted className="size-[100px] object-cover" />
                <span className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                  <Play className="size-5 text-white drop-shadow" />
                </span>
                <span className="absolute bottom-1 left-1 z-20 max-w-[88px] truncate rounded bg-black/50 px-1 text-[10px] text-white">
                  {video.name}
                </span>
                <button
                  type="button"
                  className="absolute right-1 top-1 z-20 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
                  onClick={() => handleRemoveVideo(video.path)}
                  title="移除视频"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}

            {videos.length < MAX_VIDEOS && (
              <button
                type="button"
                disabled={isPublishing}
                onClick={handlePickVideos}
                className="flex aspect-square w-[100px] cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-dashed text-foreground/50 transition-colors hover:bg-foreground/[0.04] hover:text-foreground/80"
              >
                <Video className="size-5" />
                <span className="text-xs">添加视频</span>
              </button>
            )}
          </div>
          {videos.length > 0 && (
            <p className="mt-2 text-xs text-warning">仅少量海外平台（如 X、Instagram）支持动态视频</p>
          )}
          <p className="mt-2 text-xs text-foreground/40">点击添加，或将图片/视频拖拽、粘贴到此处</p>
        </div>

        <AccountSelector
          contentType="DYNAMIC"
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
            {isPublishing ? '发布中...' : '发布动态'}
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

      {/* 图片大图预览 */}
      <Modal
        isOpen={previewImage !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewImage(null)
        }}
        size="3xl"
      >
        <ModalContent>
          <ModalBody className="flex items-center justify-center p-4">
            {previewImage && (
              <img
                src={previewImage.url}
                alt={previewImage.name}
                className="max-h-[75vh] w-auto rounded-lg object-contain"
              />
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  )
}
