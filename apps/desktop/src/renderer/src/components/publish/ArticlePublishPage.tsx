import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Tooltip } from '../ui/tooltip'
import { toast } from '../ui/sonner'
import {
  ArrowLeft,
  ArrowRight,
  Bold,
  Code,
  Eraser,
  Eye,
  Heading2,
  ImageIcon,
  Italic,
  Link2,
  List,
  PencilLine,
  Quote,
  Save,
  X
} from 'lucide-react'
import { marked } from 'marked'
import type { PlatformType, ArticleData, SyncContentData, FileData, Draft, PublishGroupSummary } from '../../../../shared/types'
import {
  AccountSelector,
  useAccountSelection,
  PublishModeSelector,
  PublishProgressCard,
  TagInput,
  fileDataFromDrop,
  fileDataFromPath,
  COVER_FILE_FILTERS,
  type AccountPublishState,
  type InitialAccountSelection,
  type PublishStep
} from './shared'
import { clearFormCache, loadFormCache, saveFormCache } from '../../lib/formCache'
import { cn } from '../../lib/utils'
import { useCreateDraft, useUpdateDraft } from '../../lib/queries'

/** 窄屏(<lg)下工作台只显示一栏,由 segmented 切换;≥lg 始终左右分栏 */
type WorkbenchPane = 'edit' | 'preview'

interface ToolbarAction {
  key: string
  label: string
  icon: React.ReactNode
  prefix: string
  suffix: string
  /** Inserted when no text is selected. */
  placeholder: string
  block?: boolean
}

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  { key: 'bold', label: '加粗', icon: <Bold />, prefix: '**', suffix: '**', placeholder: '加粗文本' },
  { key: 'italic', label: '斜体', icon: <Italic />, prefix: '*', suffix: '*', placeholder: '斜体文本' },
  { key: 'heading', label: '标题', icon: <Heading2 />, prefix: '## ', suffix: '', placeholder: '标题', block: true },
  { key: 'quote', label: '引用', icon: <Quote />, prefix: '> ', suffix: '', placeholder: '引用内容', block: true },
  { key: 'list', label: '列表', icon: <List />, prefix: '- ', suffix: '', placeholder: '列表项', block: true },
  { key: 'code', label: '代码块', icon: <Code />, prefix: '```\n', suffix: '\n```', placeholder: '代码', block: true },
  { key: 'link', label: '链接', icon: <Link2 />, prefix: '[', suffix: '](https://)', placeholder: '链接文字' }
]

const PANE_OPTIONS: Array<{ key: WorkbenchPane; label: string; icon: React.ReactNode }> = [
  { key: 'edit', label: '编辑', icon: <PencilLine className="size-3.5" /> },
  { key: 'preview', label: '预览', icon: <Eye className="size-3.5" /> }
]

function renderMarkdown(markdown: string): string {
  // Content is authored locally by the user, so raw HTML passthrough is fine
  return marked.parse(markdown, { async: false, gfm: true, breaks: true })
}

// CoverUpload(shared)的描边拖拽框版式塞不进紧凑文档头,这里内联一个
// 缩略图版:无文件时是一块 Mist 填充的小按钮,有文件时显示缩略图 + 移除钮。
interface CompactCoverUploadProps {
  file: FileData | null
  onSelect: (file: FileData) => void
  onRemove: () => void
  disabled: boolean
}

function CompactCoverUpload({ file, onSelect, onRemove, disabled }: CompactCoverUploadProps): React.ReactElement {
  const [isDragging, setIsDragging] = useState(false)

  const handlePick = useCallback(async () => {
    if (disabled) return
    try {
      const [filePath] = await window.api.app.selectFile({ filters: COVER_FILE_FILTERS })
      if (!filePath) return
      const fileData = await fileDataFromPath(filePath)
      if (fileData) {
        onSelect(fileData)
      } else {
        toast('这张封面读不出来', { description: '确认文件还在原位，重新选一次。' })
      }
    } catch (error) {
      console.error('Failed to pick cover:', error)
      toast.error('选封面出错了', { description: '再试一次。' })
    }
  }, [disabled, onSelect])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (disabled) return
      const dropped = e.dataTransfer.files[0]
      if (!dropped) return
      const fileData = await fileDataFromDrop(dropped)
      if (fileData) onSelect(fileData)
    },
    [disabled, onSelect]
  )

  if (file) {
    return (
      <div className="group relative shrink-0">
        <img src={file.url} alt="文章封面" className="h-12 w-20 rounded-lg object-cover" />
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label="移除封面"
          className="absolute -right-1.5 -top-1.5 hidden size-5 items-center justify-center rounded-full bg-foreground text-background group-hover:flex disabled:opacity-50"
        >
          <X className="size-3" />
        </button>
      </div>
    )
  }

  return (
    <Tooltip content="封面图片（可选，点击或拖拽图片）">
      <button
        type="button"
        onClick={() => void handlePick()}
        onDrop={(e) => void handleDrop(e)}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          setIsDragging(false)
        }}
        disabled={disabled}
        aria-label="上传封面"
        className={cn(
          'flex h-12 w-20 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground disabled:pointer-events-none disabled:opacity-50',
          isDragging && 'bg-muted/70 text-foreground'
        )}
      >
        <ImageIcon className="size-4" />
      </button>
    </Tooltip>
  )
}

interface ArticlePublishPageProps {
  onStartPublish: (
    platforms: PlatformType[],
    contentType: 'ARTICLE',
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

export function ArticlePublishPage({
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
}: ArticlePublishPageProps): React.ReactElement {
  // Auto-saved snapshot restores after accidental close; an explicit draft edit wins over it.
  const [cachedForm] = useState(() => (initialDraft ? null : loadFormCache('ARTICLE')))
  const [title, setTitle] = useState(cachedForm?.title || '')
  const [digest, setDigest] = useState(cachedForm?.digest || '')
  const [content, setContent] = useState(cachedForm?.content || '')
  const [tags, setTags] = useState<string[]>(cachedForm?.tags || [])
  const [coverFile, setCoverFile] = useState<FileData | null>(null)
  const [pane, setPane] = useState<WorkbenchPane>('edit')
  const [step, setStep] = useState<PublishStep>('compose')
  const [autoSubmit, setAutoSubmit] = useState(cachedForm?.autoSubmit ?? false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(
    cachedForm?.currentDraftId ?? null
  )
  const createDraft = useCreateDraft()
  const updateDraft = useUpdateDraft()
  const editorRef = useRef<HTMLTextAreaElement>(null)

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
  } = useAccountSelection('ARTICLE', initialSelection)

  // Restore the cached cover; fileDataFromPath stats the file (drops stale
  // paths) and re-registers it on the local-file:// allowlist.
  useEffect(() => {
    if (!cachedForm?.cover) return
    let cancelled = false
    void fileDataFromPath(cachedForm.cover).then((fileData) => {
      if (fileData && !cancelled) setCoverFile(fileData)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Continuously snapshot the form; debounced so typing doesn't thrash localStorage.
  useEffect(() => {
    const timer = setTimeout(() => {
      saveFormCache('ARTICLE', {
        title,
        digest,
        content,
        tags,
        cover: coverFile?.path,
        selectedAccountIds: Array.from(selectedAccountIds),
        selectedOtherPlatforms: Array.from(selectedOtherPlatforms),
        currentDraftId,
        autoSubmit
      })
    }, 600)
    return () => clearTimeout(timer)
  }, [title, digest, content, tags, coverFile, selectedAccountIds, selectedOtherPlatforms, currentDraftId, autoSubmit])

  const handleClearForm = useCallback(() => {
    setTitle('')
    setDigest('')
    setContent('')
    setTags([])
    setCoverFile(null)
    setAutoSubmit(false)
    setCurrentDraftId(null)
    clearFormCache('ARTICLE')
    toast('已清空', { description: '表单内容与自动缓存都清掉了，可以开始写新文章。' })
  }, [])

  // Load initial draft data (content holds the markdown source)
  useEffect(() => {
    if (!initialDraft) return
    setTitle(initialDraft.title || '')
    setContent(initialDraft.content || '')
    setTags(initialDraft.tags || [])
    setCurrentDraftId(initialDraft.id)

    let cancelled = false
    const restoreCover = async (): Promise<void> => {
      if (!initialDraft.cover) return
      const fileData = await fileDataFromPath(initialDraft.cover)
      if (fileData && !cancelled) setCoverFile(fileData)
    }
    void restoreCover()
    return () => {
      cancelled = true
    }
  }, [initialDraft])

  const previewHtml = useMemo(() => renderMarkdown(content), [content])

  const applyToolbarAction = useCallback(
    (action: ToolbarAction) => {
      const textarea = editorRef.current
      if (!textarea) return

      // 窄屏正在看预览时点工具按钮,先切回编辑栏,让插入结果立刻可见
      setPane('edit')

      const { selectionStart, selectionEnd, value } = textarea
      const selected = value.slice(selectionStart, selectionEnd) || action.placeholder
      const needsLeadingNewline =
        action.block && selectionStart > 0 && value[selectionStart - 1] !== '\n'
      const insert = `${needsLeadingNewline ? '\n' : ''}${action.prefix}${selected}${action.suffix}`
      const next = value.slice(0, selectionStart) + insert + value.slice(selectionEnd)

      setContent(next)
      requestAnimationFrame(() => {
        textarea.focus()
        const cursorStart =
          selectionStart + (needsLeadingNewline ? 1 : 0) + action.prefix.length
        textarea.setSelectionRange(cursorStart, cursorStart + selected.length)
      })
    },
    []
  )

  const handlePublish = useCallback(() => {
    if (selectedPlatforms.size === 0 || !title.trim() || !content.trim()) return

    const articleData: ArticleData = {
      title: title.trim(),
      digest: digest.trim(),
      cover: coverFile || ({ name: '', url: '' } as FileData),
      htmlContent: renderMarkdown(content.trim()),
      markdownContent: content.trim(),
      tags: tags.length > 0 ? tags : undefined
    }

    onStartPublish(
      Array.from(selectedPlatforms),
      'ARTICLE',
      articleData,
      autoSubmit,
      selectedAccountIds,
      selectedOtherPlatforms
    )
  }, [selectedAccountIds, selectedOtherPlatforms, selectedPlatforms, title, digest, content, tags, coverFile, autoSubmit, onStartPublish])

  const handleSaveDraft = useCallback(async () => {
    if (!title.trim() || !content.trim()) {
      toast('标题和内容都填上才能保存', { description: '补全后再点保存草稿。' })
      return
    }

    setIsSavingDraft(true)
    try {
      const draftData = {
        title: title.trim(),
        contentType: 'ARTICLE' as const,
        content: content.trim(),
        htmlContent: renderMarkdown(content.trim()),
        tags,
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
  }, [title, content, tags, coverFile, selectedPlatforms, currentDraftId, onDraftSaved, createDraft, updateDraft])

  const isContentValid = title.trim().length > 0 && content.trim().length > 0
  const hasSelectedTargets = selectedAccountIds.size > 0 || selectedOtherPlatforms.size > 0
  const canPublish = hasSelectedTargets && isContentValid && !isPublishing
  const canSaveDraft = isContentValid && !isPublishing && !isSavingDraft

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

  // 第 1 步 · 编辑器工作台:顶部文档头 + 全高编辑/预览分栏 + 底部操作条。
  // 容器吃满 h-full,编辑与预览各自滚动,页面本身不出现外层滚动。
  if (step === 'compose') {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <Card className="flex min-h-0 flex-1 flex-col divide-y overflow-hidden">
          {/* 顶部紧凑文档头:大标题 + 单行摘要 + 封面缩略 */}
          <div className="flex flex-col gap-1.5 px-5 py-4">
            <div className="flex items-center gap-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isPublishing}
                placeholder="文章标题"
                aria-label="文章标题"
                className="min-w-0 flex-1 bg-transparent text-xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/50 disabled:opacity-50"
              />

              {/* <lg 单栏时的「编辑|预览」切换 */}
              <div className="flex shrink-0 items-center gap-0.5 rounded-lg bg-muted p-0.5 lg:hidden">
                {PANE_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setPane(option.key)}
                    aria-label={option.label}
                    className={cn(
                      'flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors',
                      pane === option.key
                        ? 'bg-card text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {option.icon}
                    <span className="hidden sm:inline">{option.label}</span>
                  </button>
                ))}
              </div>

              <CompactCoverUpload
                file={coverFile}
                onSelect={setCoverFile}
                onRemove={() => setCoverFile(null)}
                disabled={isPublishing}
              />
            </div>

            <input
              value={digest}
              onChange={(e) => setDigest(e.target.value)}
              disabled={isPublishing}
              placeholder="一句话摘要（可选，部分平台使用）"
              aria-label="文章摘要"
              className="w-full bg-transparent text-sm text-muted-foreground outline-none placeholder:text-muted-foreground/40 disabled:opacity-50"
            />
          </div>

          {/* 主体:≥lg 左编辑右预览,<lg 由 segmented 决定单栏 */}
          <div className="flex min-h-0 flex-1">
            <textarea
              ref={editorRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isPublishing}
              placeholder={'# 标题\n\n用 Markdown 书写文章内容...'}
              spellCheck={false}
              aria-label="Markdown 编辑器"
              className={cn(
                'h-full min-w-0 flex-1 resize-none bg-transparent p-5 font-mono text-[0.8125rem] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/50 disabled:opacity-50',
                pane === 'preview' && 'hidden lg:block'
              )}
            />
            <div
              className={cn(
                'article-preview h-full min-w-0 flex-1 overflow-y-auto p-5 text-sm lg:border-l',
                pane === 'edit' && 'hidden lg:block'
              )}
              // 本地撰写内容的实时预览
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>

          {/* 底部操作条:markdown 工具 + 字数 + 草稿/清空/下一步 */}
          <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
            <div className="flex items-center gap-0.5">
              {TOOLBAR_ACTIONS.map((action) => (
                <Tooltip key={action.key} content={action.label}>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={isPublishing}
                    onClick={() => applyToolbarAction(action)}
                    aria-label={action.label}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {action.icon}
                  </Button>
                </Tooltip>
              ))}
            </div>

            <span className="px-1 text-xs tabular-nums text-muted-foreground">
              第 1 步 · 撰写 · {content.length} 字符
            </span>

            <div className="min-w-2 flex-1" />

            <Button variant="ghost" onClick={handleClearForm} disabled={isPublishing}>
              <Eraser />
              清空
            </Button>
            <Button
              variant="secondary"
              onClick={handleSaveDraft}
              disabled={!canSaveDraft}
              isLoading={isSavingDraft}
            >
              {!isSavingDraft && <Save />}
              保存草稿
            </Button>
            <Button onClick={() => setStep('configure')} disabled={!isContentValid}>
              下一步
              <ArrowRight />
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // 第 2 步 · 发布:左侧发布信息,右侧内容预览
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStep('compose')} disabled={isPublishing}>
          <ArrowLeft />
          上一步
        </Button>
        <span className="text-xs text-muted-foreground">第 2 步 · 发布设置</span>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-5 p-6">
          <h2 className="text-lg font-semibold">发布信息</h2>

          <TagInput value={tags} onChange={setTags} isDisabled={isPublishing} />

          <AccountSelector
            contentType="ARTICLE"
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

        <Card className="flex flex-col gap-4 p-6 lg:sticky lg:top-0">
          <span className="text-sm font-medium text-muted-foreground">内容预览</span>
          <div className="flex items-start gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h3 className="text-xl font-semibold tracking-tight">{title || '未命名文章'}</h3>
              {digest && <p className="text-sm text-muted-foreground">{digest}</p>}
            </div>
            {coverFile && (
              <img src={coverFile.url} alt="文章封面" className="h-12 w-20 shrink-0 rounded-lg object-cover" />
            )}
          </div>
          <div
            className="article-preview max-h-[60vh] overflow-y-auto text-sm"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
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
