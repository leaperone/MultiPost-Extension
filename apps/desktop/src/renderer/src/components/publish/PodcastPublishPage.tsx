import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { Button, Card, Input, Textarea, Spinner, addToast } from '@heroui/react'
import { ArrowLeft, ArrowRight, Eraser, Upload, X, Image, Save, Music } from 'lucide-react'
import type { PlatformType, PodcastData, SyncContentData, FileData, Draft, PublishGroupSummary } from '../../../../shared/types'
import {
  AccountSelector,
  useAccountSelection,
  AutoSubmitToggle,
  PublishProgressCard,
  TagInput,
  formatFileSize,
  type AccountPublishState,
  type InitialAccountSelection,
  type PublishStep
} from './shared'
import { clearFormCache, loadFormCache, saveFormCache } from '../../lib/formCache'

interface PodcastPublishPageProps {
  onStartPublish: (
    platforms: PlatformType[],
    contentType: 'PODCAST',
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

const AUDIO_FILE_FILTERS = [
  { name: 'Audio', extensions: ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac'] }
]

const COVER_FILE_FILTERS = [
  { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }
]

function getDraggedFilePath(file: File): string | null {
  try {
    return window.api.app.getPathForFile(file) || null
  } catch {
    return null
  }
}

export function PodcastPublishPage({
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
}: PodcastPublishPageProps): React.ReactElement {
  // Auto-saved snapshot restores after accidental close; an explicit draft edit wins over it.
  const [cachedForm] = useState(() => (initialDraft ? null : loadFormCache('PODCAST')))
  const [title, setTitle] = useState(cachedForm?.title || '')
  const [description, setDescription] = useState(cachedForm?.content || '')
  const [tags, setTags] = useState<string[]>(cachedForm?.tags || [])
  const [audioFile, setAudioFile] = useState<FileData | null>(null)
  const [coverFile, setCoverFile] = useState<FileData | null>(null)
  const [isDraggingAudio, setIsDraggingAudio] = useState(false)
  const [step, setStep] = useState<PublishStep>('compose')
  const [autoSubmit, setAutoSubmit] = useState(cachedForm?.autoSubmit ?? false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(
    cachedForm?.currentDraftId ?? null
  )

  const audioInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

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

  const {
    selectedAccountIds,
    selectedOtherPlatforms,
    selectedPlatforms,
    handleAccountToggle,
    handleOtherPlatformToggle
  } = useAccountSelection('PODCAST', initialSelection)

  // Restore cached media; getFileInfo stats the file (so stale paths are
  // dropped) and re-registers it on the local-file:// allowlist.
  useEffect(() => {
    if (!cachedForm) return
    let cancelled = false
    const restore = async (
      path: string | undefined,
      apply: (file: FileData) => void
    ): Promise<void> => {
      if (!path) return
      try {
        const fileData = await window.api.app.getFileInfo(path)
        if (!cancelled) apply(fileData)
      } catch {
        // Stale path; silently dropped from the restored form.
      }
    }
    void Promise.all([
      restore(cachedForm.mainMedia, setAudioFile),
      restore(cachedForm.cover, setCoverFile)
    ])
    return () => {
      cancelled = true
    }
  }, [])

  // Continuously snapshot the form; debounced so typing doesn't thrash localStorage.
  useEffect(() => {
    const timer = setTimeout(() => {
      saveFormCache('PODCAST', {
        title,
        content: description,
        tags,
        mainMedia: audioFile?.path,
        cover: coverFile?.path,
        selectedAccountIds: Array.from(selectedAccountIds),
        selectedOtherPlatforms: Array.from(selectedOtherPlatforms),
        currentDraftId,
        autoSubmit
      })
    }, 600)
    return () => clearTimeout(timer)
  }, [title, description, tags, audioFile, coverFile, selectedAccountIds, selectedOtherPlatforms, currentDraftId, autoSubmit])

  const handleClearForm = useCallback(() => {
    setTitle('')
    setDescription('')
    setTags([])
    setAudioFile(null)
    setCoverFile(null)
    setAutoSubmit(false)
    setCurrentDraftId(null)
    clearFormCache('PODCAST')
    addToast({
      title: '已清空',
      description: '表单内容与自动缓存已清空',
      hideIcon: true
    })
  }, [])

  useEffect(() => {
    if (!initialDraft) return
    setTitle(initialDraft.title || '')
    setDescription(initialDraft.content || '')
    setTags(initialDraft.tags || [])
    setCurrentDraftId(initialDraft.id)

    // The draft's `video` column doubles as the podcast audio path.
    let cancelled = false
    const restoreMedia = async (): Promise<void> => {
      if (initialDraft.video) {
        try {
          const fileData = await window.api.app.getFileInfo(initialDraft.video)
          if (!cancelled) setAudioFile(fileData)
        } catch (error) {
          console.error('Failed to restore draft audio:', error)
        }
      }
      if (initialDraft.cover) {
        try {
          const fileData = await window.api.app.getFileInfo(initialDraft.cover)
          if (!cancelled) setCoverFile(fileData)
        } catch (error) {
          console.error('Failed to restore draft cover:', error)
        }
      }
    }
    void restoreMedia()
    return () => {
      cancelled = true
    }
  }, [initialDraft])

  const loadFileData = useCallback(async (filePath: string): Promise<FileData | null> => {
    try {
      return await window.api.app.getFileInfo(filePath)
    } catch (error) {
      console.error('Failed to read file info:', error)
      addToast({
        title: '文件读取失败',
        description: '无法读取本地文件信息',
        hideIcon: true
      })
      return null
    }
  }, [])

  const handleSelectAudio = useCallback(async () => {
    if (isPublishing) return
    const [filePath] = await window.api.app.selectFile({ filters: AUDIO_FILE_FILTERS })
    if (!filePath) return
    const fileData = await loadFileData(filePath)
    if (fileData) {
      setAudioFile(fileData)
    }
  }, [isPublishing, loadFileData])

  const handleAudioInputChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return
      const filePath = getDraggedFilePath(file)
      if (!filePath) {
        addToast({
          title: '请选择本地文件',
          description: '请点击上传区域选择音频文件，以便桌面端获取本地路径',
          hideIcon: true
        })
        event.target.value = ''
        return
      }
      const fileData = await loadFileData(filePath)
      if (fileData) {
        setAudioFile(fileData)
      }
      event.target.value = ''
    },
    [loadFileData]
  )

  const handleAudioDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault()
      setIsDraggingAudio(false)
      const file = event.dataTransfer.files[0]
      if (!file) return
      const filePath = getDraggedFilePath(file)
      if (!filePath) {
        addToast({
          title: '拖拽上传不可用',
          description: '请点击上传区域选择音频文件',
          hideIcon: true
        })
        return
      }
      const fileData = await loadFileData(filePath)
      if (fileData) {
        setAudioFile(fileData)
      }
    },
    [loadFileData]
  )

  const handleAudioDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    setIsDraggingAudio(true)
  }, [])

  const handleAudioDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    setIsDraggingAudio(false)
  }, [])

  const handleRemoveAudio = useCallback(() => {
    setAudioFile(null)
    if (audioInputRef.current) {
      audioInputRef.current.value = ''
    }
  }, [])

  const handleSelectCover = useCallback(async () => {
    if (isPublishing) return
    const [filePath] = await window.api.app.selectFile({ filters: COVER_FILE_FILTERS })
    if (!filePath) return
    const fileData = await loadFileData(filePath)
    if (fileData) {
      setCoverFile(fileData)
    }
  }, [isPublishing, loadFileData])

  const handleCoverInputChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return
      const filePath = getDraggedFilePath(file)
      if (!filePath) {
        addToast({
          title: '请选择本地文件',
          description: '请点击上传区域选择封面图片',
          hideIcon: true
        })
        event.target.value = ''
        return
      }
      const fileData = await loadFileData(filePath)
      if (fileData) {
        setCoverFile(fileData)
      }
      event.target.value = ''
    },
    [loadFileData]
  )

  const handleRemoveCover = useCallback(() => {
    setCoverFile(null)
    if (coverInputRef.current) {
      coverInputRef.current.value = ''
    }
  }, [])

  const handlePublish = useCallback(() => {
    if (selectedPlatforms.size === 0 || !title.trim() || !audioFile) return

    const podcastData: PodcastData = {
      title: title.trim(),
      description: description.trim(),
      audio: audioFile,
      cover: coverFile || undefined,
      tags
    }

    onStartPublish(
      Array.from(selectedPlatforms),
      'PODCAST',
      podcastData,
      autoSubmit,
      selectedAccountIds,
      selectedOtherPlatforms
    )
  }, [selectedAccountIds, selectedOtherPlatforms, selectedPlatforms, title, description, audioFile, coverFile, tags, autoSubmit, onStartPublish])

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
        contentType: 'PODCAST' as const,
        content: description.trim(),
        tags,
        // Reuse the video column for the audio path; drafts are local-only.
        video: audioFile?.path,
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
  }, [title, description, tags, selectedPlatforms, currentDraftId, onDraftSaved])

  const isContentValid = title.trim().length > 0 && audioFile !== null
  const hasSelectedTargets = selectedAccountIds.size > 0 || selectedOtherPlatforms.size > 0
  const canPublish = hasSelectedTargets && isContentValid && !isPublishing
  const canSaveDraft = title.trim().length > 0 && !isPublishing && !isSavingDraft

  // 第 1 步 · 创作：大上传区 + 标题/描述
  if (step === 'compose') {
    return (
      <div className="flex flex-col gap-6">
        <Card className="flex flex-col gap-5 p-6 shadow-none border">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">发布播客</h2>
            <span className="text-xs text-muted-foreground">第 1 步 · 上传与编辑</span>
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium">音频文件</label>
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"
              onChange={handleAudioInputChange}
              className="hidden"
              disabled={isPublishing}
            />
            {!audioFile ? (
              <div
                onClick={() => !isPublishing && handleSelectAudio()}
                onDrop={handleAudioDrop}
                onDragOver={handleAudioDragOver}
                onDragLeave={handleAudioDragLeave}
                className={`flex min-h-[40vh] flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  isDraggingAudio
                    ? 'border-primary bg-primary/5'
                    : 'border-default-300 hover:border-primary/50'
                } ${isPublishing ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <Upload className="size-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-1">
                  点击或拖拽音频文件到此处上传
                </p>
                <p className="text-xs text-muted-foreground">支持 MP3, WAV, M4A, AAC 等格式</p>
              </div>
            ) : (
              <div className="relative border rounded-lg overflow-hidden">
                <div className="p-4">
                  <audio src={audioFile.url} controls className="w-full" />
                </div>
                <div className="p-3 bg-muted/50 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Music className="size-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm truncate">{audioFile.name}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {formatFileSize(audioFile.size || 0)}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    isIconOnly
                    onPress={handleRemoveAudio}
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
            label="播客标题"
            placeholder="输入播客标题..."
            value={title}
            onValueChange={setTitle}
            isDisabled={isPublishing}
          />

          <Textarea
            label="播客描述"
            placeholder="输入播客描述..."
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

          <div>
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
                onClick={() => !isPublishing && handleSelectCover()}
                onDrop={async (event) => {
                  event.preventDefault()
                  if (isPublishing) return
                  const file = event.dataTransfer.files[0]
                  if (!file) return
                  const filePath = getDraggedFilePath(file)
                  if (!filePath) return
                  const fileData = await loadFileData(filePath)
                  if (fileData) setCoverFile(fileData)
                }}
                onDragOver={(event) => event.preventDefault()}
                className={`flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors border-default-300 hover:border-primary/50 ${isPublishing ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <Image className="size-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">点击或拖拽图片到此处</span>
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

          <TagInput value={tags} onChange={setTags} isDisabled={isPublishing} />

          <AccountSelector
            contentType="PODCAST"
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
            {isPublishing ? '发布中...' : '发布播客'}
          </Button>
        </Card>

        <Card className="flex flex-col gap-4 p-6 shadow-none border lg:sticky lg:top-0">
          <span className="text-sm font-medium text-muted-foreground">内容预览</span>
          {coverFile && (
            <img
              src={coverFile.url}
              alt="Cover"
              className="h-32 w-auto self-start rounded-lg object-cover"
            />
          )}
          {audioFile && <audio src={audioFile.url} controls className="w-full" />}
          <h3 className="text-xl font-semibold tracking-tight">{title || '未命名播客'}</h3>
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
