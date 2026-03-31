import { useState, useCallback, useEffect } from 'react'
import { Button, Card, Input, Textarea, Spinner, addToast } from '@heroui/react'
import { Save } from 'lucide-react'
import type { PlatformType, ArticleData, SyncContentData, FileData, Draft } from '../../../../shared/types'
import {
  AccountSelector,
  useAccountSelection,
  AutoSubmitToggle,
  PublishProgressCard,
  type AccountPublishState
} from './shared'

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
  } = useAccountSelection('ARTICLE')

  // Load initial draft data
  useEffect(() => {
    if (initialDraft) {
      setTitle(initialDraft.title || '')
      setContent(initialDraft.htmlContent || initialDraft.content || '')
      setCurrentDraftId(initialDraft.id)
    }
  }, [initialDraft])

  const handlePublish = useCallback(() => {
    if (selectedPlatforms.size === 0 || !title.trim() || !content.trim()) return

    const articleData: ArticleData = {
      title: title.trim(),
      digest: digest.trim(),
      cover: { name: '', url: '' } as FileData,
      htmlContent: content.trim(),
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
        content: digest.trim(),
        htmlContent: content.trim(),
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
  }, [title, digest, content, selectedPlatforms, currentDraftId, onDraftSaved])

  const isContentValid = title.trim().length > 0 && content.trim().length > 0
  const hasSelectedTargets = selectedAccountIds.size > 0 || selectedOtherPlatforms.size > 0
  const canPublish = hasSelectedTargets && isContentValid && !isPublishing
  const canSaveDraft = isContentValid && !isPublishing && !isSavingDraft

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

        <div className="mb-5">
          <Textarea
            label="文章内容"
            placeholder="输入文章内容（支持 Markdown）..."
            value={content}
            onValueChange={setContent}
            minRows={12}
            classNames={{ input: 'font-mono text-sm' }}
            isDisabled={isPublishing}
          />
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
