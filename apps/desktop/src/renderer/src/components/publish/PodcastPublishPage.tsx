import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { toast } from '../ui/sonner'
import { ArrowLeft, ArrowRight, Eraser, Upload, X, Image, Save, Music } from 'lucide-react'
import type { PlatformType, PodcastData, SyncContentData, FileData, Draft, PublishGroupSummary } from '../../../../shared/types'
import {
  AccountSelector,
  useAccountSelection,
  PublishModeSelector,
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
  /** 手动确认模式下进度卡「全部发布」的提交通道。 */
  onSubmitAll?: () => void
  /** 全部成功后「清空并开始新内容」需要顺带清掉进度状态。 */
  onClearProgress?: () => void
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
  onSubmitAll,
  onClearProgress,
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
    toast('已清空', { description: '表单内容与自动缓存都清掉了，可以开始新一期。' })
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
      toast.error('这个文件读不出来', {
        description: '确认文件还在原来的位置，然后重新选择一次。'
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
        toast('没拿到这个文件的本地路径', {
          description: '点击上传区域、从本地选择音频文件即可。'
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
        toast('拖拽没能拿到文件路径', {
          description: '点击上传区域、从本地选择音频文件即可。'
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
        toast('没拿到这个文件的本地路径', {
          description: '点击上传区域、从本地选择封面图片即可。'
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
      toast('还没有标题', { description: '先给这期播客起个标题，再点保存草稿。' })
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
  }, [title, description, tags, selectedPlatforms, currentDraftId, onDraftSaved])

  const isContentValid = title.trim().length > 0 && audioFile !== null
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
          <h2 className="text-xl font-semibold">发布播客</h2>
          <span className="text-xs text-muted-foreground">第 1 步 · 上传与编辑</span>
        </div>

        <Card className="flex flex-col gap-5 p-6">
          {/* 宽屏双栏：左边音频，右边标题/描述；窄窗落回单列 */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-muted-foreground">音频文件</label>
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
                  className={`flex min-h-[40vh] flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border p-8 cursor-pointer transition-colors ${
                    isDraggingAudio ? 'bg-foreground/[0.05]' : 'bg-foreground/[0.02] hover:bg-foreground/[0.05]'
                  } ${isPublishing ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <Upload className="size-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">点击或拖拽音频文件到此处上传</p>
                  <p className="text-xs text-muted-foreground">支持 MP3, WAV, M4A, AAC 等格式</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl bg-foreground/[0.03]">
                  <div className="p-4">
                    <audio src={audioFile.url} controls className="w-full" />
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Music className="size-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate">{audioFile.name}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatFileSize(audioFile.size || 0)}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={handleRemoveAudio}
                      disabled={isPublishing}
                      aria-label="移除音频"
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
                label="播客标题"
                placeholder="输入播客标题..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isPublishing}
              />

              <Textarea
                label="播客描述"
                placeholder="输入播客描述..."
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

          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-muted-foreground">
              封面图片 <span className="font-normal">（可选）</span>
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
                className={`flex items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-foreground/[0.02] p-4 cursor-pointer transition-colors hover:bg-foreground/[0.05] ${isPublishing ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <Image className="size-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">点击或拖拽图片到此处</span>
              </div>
            ) : (
              <div className="relative inline-block self-start">
                <img
                  src={coverFile.url}
                  alt="Cover"
                  className="h-24 w-auto rounded-lg object-cover ring-1 ring-foreground/5"
                />
                <Button
                  variant="secondary"
                  size="icon-sm"
                  onClick={handleRemoveCover}
                  disabled={isPublishing}
                  aria-label="移除封面"
                  className="absolute -top-2 -right-2 size-6 rounded-full shadow-sm [&_svg]:size-3"
                >
                  <X />
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
          {coverFile && (
            <img
              src={coverFile.url}
              alt="Cover"
              className="h-32 w-auto self-start rounded-lg object-cover ring-1 ring-foreground/5"
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
        onSubmitAll={onSubmitAll}
        onStartNew={handleStartNew}
      />
    </div>
  )
}
