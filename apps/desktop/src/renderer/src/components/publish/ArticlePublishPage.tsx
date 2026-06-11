import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { Button, Card, Input, Textarea, Spinner, Tooltip, addToast } from '@heroui/react'
import {
  Bold,
  Code,
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
import type { PlatformType, ArticleData, SyncContentData, FileData, Draft } from '../../../../shared/types'
import {
  AccountSelector,
  useAccountSelection,
  AutoSubmitToggle,
  PublishProgressCard,
  type AccountPublishState
} from './shared'

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
  isPublishing: boolean
  onViewAccount?: (accountId: string) => void
  onCancelPublish?: () => void
  onRetryAccount?: (accountId: string) => void
  onCancelAccount?: (accountId: string) => void
  initialDraft?: Draft
  onDraftSaved?: () => void
}

export function ArticlePublishPage({
  onStartPublish,
  publishStates,
  isPublishing,
  onViewAccount,
  onCancelPublish,
  onRetryAccount,
  onCancelAccount,
  initialDraft,
  onDraftSaved
}: ArticlePublishPageProps): React.ReactElement {
  const [title, setTitle] = useState('')
  const [digest, setDigest] = useState('')
  const [content, setContent] = useState('')
  const [mode, setMode] = useState<EditorMode>('split')
  const [autoSubmit, setAutoSubmit] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null)
  const editorRef = useRef<HTMLTextAreaElement>(null)

  // Use account selection hook
  const {
    selectedAccountIds,
    selectedOtherPlatforms,
    selectedPlatforms,
    handleAccountToggle,
    handleOtherPlatformToggle
  } = useAccountSelection('ARTICLE')

  // Load initial draft data (content holds the markdown source)
  useEffect(() => {
    if (initialDraft) {
      setTitle(initialDraft.title || '')
      setContent(initialDraft.content || '')
      setCurrentDraftId(initialDraft.id)
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
      cover: { name: '', url: '' } as FileData,
      htmlContent: renderMarkdown(content.trim()),
      markdownContent: content.trim()
    }

    onStartPublish(
      Array.from(selectedPlatforms),
      'ARTICLE',
      articleData,
      autoSubmit,
      selectedAccountIds,
      selectedOtherPlatforms
    )
  }, [selectedAccountIds, selectedOtherPlatforms, selectedPlatforms, title, digest, content, autoSubmit, onStartPublish])

  const handleSaveDraft = useCallback(async () => {
    if (!title.trim() || !content.trim()) {
      addToast({
        title: '保存失败',
        description: '请输入标题和内容后再保存',
        hideIcon: true
      })
      return
    }

    setIsSavingDraft(true)
    try {
      const draftData = {
        title: title.trim(),
        contentType: 'ARTICLE' as const,
        content: content.trim(),
        htmlContent: renderMarkdown(content.trim()),
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
  }, [title, content, selectedPlatforms, currentDraftId, onDraftSaved])

  const isContentValid = title.trim().length > 0 && content.trim().length > 0
  const hasSelectedTargets = selectedAccountIds.size > 0 || selectedOtherPlatforms.size > 0
  const canPublish = hasSelectedTargets && isContentValid && !isPublishing
  const canSaveDraft = isContentValid && !isPublishing && !isSavingDraft

  const showEditor = mode !== 'preview'
  const showPreview = mode !== 'edit'

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6 shadow-none border">
        <h2 className="text-lg font-semibold mb-5">发布文章</h2>

        <div className="mb-5">
          <Input
            label="文章标题"
            placeholder="输入文章标题..."
            value={title}
            onValueChange={setTitle}
            isDisabled={isPublishing}
          />
        </div>

        <div className="mb-5">
          <Textarea
            label="摘要（可选）"
            placeholder="输入文章摘要..."
            value={digest}
            onValueChange={setDigest}
            minRows={2}
            isDisabled={isPublishing}
          />
        </div>

        {/* Markdown 编辑器：工具栏 + 编辑/分屏/预览 */}
        <div className="mb-5 overflow-hidden rounded-xl border">
          <div className="flex items-center justify-between gap-2 border-b bg-foreground/[0.02] px-2 py-1.5">
            <div className="flex items-center gap-0.5">
              {TOOLBAR_ACTIONS.map((action) => (
                <Tooltip key={action.key} content={action.label} delay={400} closeDelay={0}>
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
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-foreground/50 hover:text-foreground'
                  }`}
                >
                  {option.icon}
                  <span className="hidden sm:inline">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={`grid min-h-[360px] ${mode === 'split' ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {showEditor && (
              <textarea
                ref={editorRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={isPublishing}
                placeholder={'# 标题\n\n用 Markdown 书写文章内容...'}
                spellCheck={false}
                className={`min-h-[360px] w-full resize-y bg-transparent p-4 font-mono text-sm leading-relaxed outline-none placeholder:text-foreground/30 ${
                  mode === 'split' ? 'border-r' : ''
                }`}
              />
            )}
            {showPreview && (
              <div
                className="article-preview min-h-[360px] overflow-y-auto p-4 text-sm"
                // 本地撰写内容的实时预览
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            )}
          </div>

          <div className="flex items-center justify-end border-t bg-foreground/[0.02] px-3 py-1 text-xs text-foreground/40">
            {content.length} 字符
          </div>
        </div>

        <AccountSelector
          contentType="ARTICLE"
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
            {isPublishing ? '发布中...' : '发布文章'}
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
