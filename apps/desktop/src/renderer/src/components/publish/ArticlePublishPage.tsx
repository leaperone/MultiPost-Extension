import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
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
  Italic,
  Link2,
  List,
  PencilLine,
  Quote,
  Save,
  SquareSplitHorizontal
} from 'lucide-react'
import { marked } from 'marked'
import type { PlatformType, ArticleData, SyncContentData, FileData, Draft, PublishGroupSummary } from '../../../../shared/types'
import {
  AccountSelector,
  useAccountSelection,
  PublishModeSelector,
  PublishProgressCard,
  TagInput,
  CoverUpload,
  fileDataFromPath,
  type AccountPublishState,
  type InitialAccountSelection,
  type PublishStep
} from './shared'
import { clearFormCache, loadFormCache, saveFormCache } from '../../lib/formCache'

type EditorMode = 'edit' | 'split' | 'preview'

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
  { key: 'bold', label: '加粗', icon: <Bold className="size-4" />, prefix: '**', suffix: '**', placeholder: '加粗文本' },
  { key: 'italic', label: '斜体', icon: <Italic className="size-4" />, prefix: '*', suffix: '*', placeholder: '斜体文本' },
  { key: 'heading', label: '标题', icon: <Heading2 className="size-4" />, prefix: '## ', suffix: '', placeholder: '标题', block: true },
  { key: 'quote', label: '引用', icon: <Quote className="size-4" />, prefix: '> ', suffix: '', placeholder: '引用内容', block: true },
  { key: 'list', label: '列表', icon: <List className="size-4" />, prefix: '- ', suffix: '', placeholder: '列表项', block: true },
  { key: 'code', label: '代码块', icon: <Code className="size-4" />, prefix: '```\n', suffix: '\n```', placeholder: '代码', block: true },
  { key: 'link', label: '链接', icon: <Link2 className="size-4" />, prefix: '[', suffix: '](https://)', placeholder: '链接文字' }
]

const MODE_OPTIONS: Array<{ key: EditorMode; label: string; icon: React.ReactNode }> = [
  { key: 'edit', label: '编辑', icon: <PencilLine className="size-4" /> },
  { key: 'split', label: '分屏', icon: <SquareSplitHorizontal className="size-4" /> },
  { key: 'preview', label: '预览', icon: <Eye className="size-4" /> }
]

function renderMarkdown(markdown: string): string {
  // Content is authored locally by the user, so raw HTML passthrough is fine
  return marked.parse(markdown, { async: false, gfm: true, breaks: true })
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
  const [mode, setMode] = useState<EditorMode>('split')
  const [step, setStep] = useState<PublishStep>('compose')
  const [autoSubmit, setAutoSubmit] = useState(cachedForm?.autoSubmit ?? false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(
    cachedForm?.currentDraftId ?? null
  )
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
  }, [title, content, tags, coverFile, selectedPlatforms, currentDraftId, onDraftSaved])

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

  const showEditor = mode !== 'preview'
  const showPreview = mode !== 'edit'

  // 第 1 步 · 撰写：沉浸式 Markdown 编辑
  if (step === 'compose') {
    return (
      <div className="flex flex-col gap-6">
        <Card className="flex flex-col gap-5 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">发布文章</h2>
            <span className="text-xs text-muted-foreground">第 1 步 · 撰写内容</span>
          </div>

          <Input
            label="文章标题"
            placeholder="输入文章标题..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isPublishing}
          />

          {/* Markdown 编辑器：工具栏 + 编辑/分屏/预览 */}
          <div className="overflow-hidden rounded-xl border">
            <div className="flex items-center justify-between gap-2 border-b bg-foreground/[0.02] px-2 py-1.5">
              <div className="flex items-center gap-0.5">
                {TOOLBAR_ACTIONS.map((action) => (
                  <Tooltip key={action.key} content={action.label}>
                    <button
                      type="button"
                      disabled={isPublishing || mode === 'preview'}
                      onClick={() => applyToolbarAction(action)}
                      className="rounded-md p-1.5 text-foreground/60 transition-colors hover:bg-foreground/[0.06] hover:text-foreground disabled:opacity-40"
                    >
                      {action.icon}
                    </button>
                  </Tooltip>
                ))}
              </div>

              <div className="flex items-center gap-0.5 rounded-lg bg-foreground/[0.04] p-0.5">
                {MODE_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setMode(option.key)}
                    title={option.label}
                    className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors ${
                      mode === option.key
                        ? 'bg-background text-foreground border'
                        : 'text-foreground/50 hover:text-foreground'
                    }`}
                  >
                    {option.icon}
                    <span className="hidden sm:inline">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={`grid min-h-[60vh] ${mode === 'split' ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {showEditor && (
                <textarea
                  ref={editorRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  disabled={isPublishing}
                  placeholder={'# 标题\n\n用 Markdown 书写文章内容...'}
                  spellCheck={false}
                  className={`min-h-[60vh] w-full resize-y bg-transparent p-4 font-mono text-sm leading-relaxed outline-none placeholder:text-foreground/30 ${
                    mode === 'split' ? 'border-r' : ''
                  }`}
                />
              )}
              {showPreview && (
                <div
                  className="article-preview min-h-[60vh] overflow-y-auto p-4 text-sm"
                  // 本地撰写内容的实时预览
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              )}
            </div>

            <div className="flex items-center justify-end border-t bg-foreground/[0.02] px-3 py-1 text-xs text-foreground/40">
              {content.length} 字符
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

          <Textarea
            label="摘要（可选）"
            placeholder="输入文章摘要..."
            value={digest}
            onChange={(e) => setDigest(e.target.value)}
            rows={2}
            disabled={isPublishing}
          />

          <CoverUpload
            label="封面图片"
            hint="（可选，部分平台使用）"
            file={coverFile}
            onSelect={setCoverFile}
            onRemove={() => setCoverFile(null)}
            isDisabled={isPublishing}
          />

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
          <h3 className="text-xl font-semibold tracking-tight">{title || '未命名文章'}</h3>
          {digest && <p className="text-sm text-muted-foreground">{digest}</p>}
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
