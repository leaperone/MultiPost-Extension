import { useState, useCallback, useEffect } from 'react'
import { Button, Card, Image, Input, Textarea, Spinner, addToast } from '@heroui/react'
import { ImagePlus, Save, X } from 'lucide-react'
import type { PlatformType, DynamicData, FileData, SyncContentData, Draft } from '../../../../shared/types'
import { createLocalFileUrl } from '../../../../shared/types'
import {
  AccountSelector,
  useAccountSelection,
  AutoSubmitToggle,
  PublishProgressCard,
  type AccountPublishState
} from './shared'

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic', 'avif']
const MAX_IMAGES = 20

interface LocalImage extends FileData {
  /** Filesystem path; what fill scripts ultimately need (via local-file://). */
  path: string
}

function imageFromPath(path: string): LocalImage {
  const name = path.split(/[\\/]/).pop() || path
  const ext = (name.split('.').pop() || '').toLowerCase()
  return {
    path,
    name,
    url: createLocalFileUrl(path),
    type: `image/${ext === 'jpg' ? 'jpeg' : ext || 'png'}`
  }
}

function isImagePath(path: string): boolean {
  const ext = (path.split('.').pop() || '').toLowerCase()
  return IMAGE_EXTENSIONS.includes(ext)
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
  const [images, setImages] = useState<LocalImage[]>([])
  const [isDraggingImages, setIsDraggingImages] = useState(false)
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
      setImages((initialDraft.images || []).filter(isImagePath).map(imageFromPath))
      setCurrentDraftId(initialDraft.id)
    }
  }, [initialDraft])

  const addImagePaths = useCallback((paths: string[]) => {
    const valid = paths.filter(isImagePath)
    if (valid.length === 0) return

    setImages((prev) => {
      const existing = new Set(prev.map((img) => img.path))
      const next = [...prev]
      for (const path of valid) {
        if (!existing.has(path) && next.length < MAX_IMAGES) {
          next.push(imageFromPath(path))
        }
      }
      return next
    })
  }, [])

  const handlePickImages = useCallback(async () => {
    try {
      const paths = await window.api.app.selectFile({
        filters: [{ name: '图片', extensions: IMAGE_EXTENSIONS }],
        multiple: true
      })
      if (paths?.length) {
        addImagePaths(paths)
      }
    } catch (error) {
      console.error('Failed to select images:', error)
    }
  }, [addImagePaths])

  const handleImageDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDraggingImages(false)
      const paths = Array.from(e.dataTransfer.files)
        .map((file) => {
          try {
            return window.api.app.getPathForFile(file)
          } catch {
            return ''
          }
        })
        .filter(Boolean)
      addImagePaths(paths)
    },
    [addImagePaths]
  )

  const handleRemoveImage = useCallback((path: string) => {
    setImages((prev) => prev.filter((img) => img.path !== path))
  }, [])

  const handlePublish = useCallback(() => {
    if (selectedPlatforms.size === 0 || !content.trim()) return

    const dynamicData: DynamicData = {
      title: title.trim(),
      content: content.trim(),
      images: images.map(({ url, name, type, size }) => ({ url, name, type, size })),
      videos: []
    }

    onStartPublish(
      Array.from(selectedPlatforms),
      'DYNAMIC',
      dynamicData,
      autoSubmit,
      selectedAccountIds,
      selectedOtherPlatforms
    )
  }, [selectedAccountIds, selectedOtherPlatforms, selectedPlatforms, title, content, images, autoSubmit, onStartPublish])

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
  }, [title, content, images, selectedPlatforms, currentDraftId, onDraftSaved])

  const isContentValid = content.trim().length > 0
  const hasSelectedTargets = selectedAccountIds.size > 0 || selectedOtherPlatforms.size > 0
  const canPublish = hasSelectedTargets && isContentValid && !isPublishing
  const canSaveDraft = isContentValid && !isPublishing && !isSavingDraft

  return (
    <div className="flex flex-col gap-6">
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
        </div>

        {/* 图片上传区 */}
        <div
          className={`mb-5 rounded-xl transition-colors ${isDraggingImages ? 'bg-foreground/[0.04]' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDraggingImages(true)
          }}
          onDragLeave={(e) => {
            e.preventDefault()
            setIsDraggingImages(false)
          }}
          onDrop={handleImageDrop}
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
                <Image
                  src={img.url}
                  alt={img.name}
                  width={100}
                  height={100}
                  radius="none"
                  className="size-[100px] object-cover"
                />
                <span className="absolute bottom-1 left-1 z-20 rounded bg-black/50 px-1 text-[10px] text-white">
                  {index + 1}
                </span>
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
          <p className="mt-2 text-xs text-foreground/40">点击添加或将图片拖拽到此处</p>
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
    </div>
  )
}
