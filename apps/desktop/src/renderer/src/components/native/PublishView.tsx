import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Draft, PlatformType, SyncContentData, SyncContentType } from '@shared/types'

import { isTerminalTargetStatus, usePublishStore } from '../../store/publish.store'
import { useUiStore } from '../../store/ui.store'
import { DynamicPublishPage } from '../publish/DynamicPublishPage'
import { VideoPublishPage } from '../publish/VideoPublishPage'
import { ArticlePublishPage } from '../publish/ArticlePublishPage'
import { PodcastPublishPage } from '../publish/PodcastPublishPage'

/**
 * Bridges the per-content-type publish forms to the publish-group flow. The
 * group's per-target progress (status + executing step + errors) is mirrored
 * into the in-page progress card, with per-account skip/retry and a final
 * run summary.
 */
export function PublishView({ contentType }: { contentType: SyncContentType }): React.ReactElement {
  const startPublish = usePublishStore((state) => state.startPublish)
  const isStarting = usePublishStore((state) => state.isStarting)
  const activeGroupId = usePublishStore((state) => state.activeGroupId)
  const activeContentType = usePublishStore((state) => state.activeContentType)
  const autoPublish = usePublishStore((state) => state.autoPublish)
  const targets = usePublishStore((state) => state.targets)
  const summary = usePublishStore((state) => state.summary)
  const skipTarget = usePublishStore((state) => state.skipTarget)
  const retryTarget = usePublishStore((state) => state.retryTarget)
  const submitAllReady = usePublishStore((state) => state.submitAllReady)
  const clearProgress = usePublishStore((state) => state.clearProgress)
  const draftToEdit = useUiStore((state) => state.draftToEdit)
  const setDraftToEdit = useUiStore((state) => state.setDraftToEdit)

  // Consume the handed-over draft once so revisiting the page starts clean.
  const [initialDraft, setInitialDraft] = useState<Draft | undefined>(undefined)
  useEffect(() => {
    if (draftToEdit && draftToEdit.contentType === contentType) {
      setInitialDraft(draftToEdit)
      setDraftToEdit(null)
    }
  }, [draftToEdit, contentType, setDraftToEdit])

  const handleStartPublish = useCallback(
    (
      _platforms: PlatformType[],
      type: SyncContentType,
      data: SyncContentData,
      autoSubmit: boolean,
      selectedAccountIds: Set<string>,
      selectedOtherPlatforms?: Set<PlatformType>
    ) => {
      void startPublish({
        contentType: type,
        data,
        selectedAccountIds,
        selectedOtherPlatforms,
        autoSubmit
      })
    },
    [startPublish]
  )

  const handleViewAccount = useCallback(
    (accountId: string) => {
      if (!activeGroupId) return
      void window.api.publishGroup
        .show(activeGroupId)
        .then(() => window.api.publishGroup.switchTab(activeGroupId, accountId))
        .catch((error) => console.error('Failed to open group tab:', error))
    },
    [activeGroupId]
  )

  const handleCancelPublish = useCallback(() => {
    if (!activeGroupId) return
    void window.api.publish.cancel(activeGroupId).catch((error: unknown) => {
      console.error('Failed to cancel publish group:', error)
    })
  }, [activeGroupId])

  // Only this page's run is shown here; another content type's run stays in
  // its own page. The form locks while an auto-publish run is still working.
  const isRunForThisPage = activeContentType === contentType
  const hasActiveRun = useMemo(
    () => targets.some((target) => !isTerminalTargetStatus(target.status)),
    [targets]
  )
  const commonProps = {
    publishStates: isRunForThisPage ? targets : [],
    isPublishing: isStarting || (isRunForThisPage && autoPublish && hasActiveRun),
    summary: isRunForThisPage ? summary : null,
    onViewAccount: handleViewAccount,
    onCancelPublish: handleCancelPublish,
    onRetryAccount: (accountId: string) => void retryTarget(accountId),
    onCancelAccount: (accountId: string) => void skipTarget(accountId),
    onSubmitAll: () => void submitAllReady(),
    onClearProgress: clearProgress
  }

  switch (contentType) {
    case 'VIDEO':
      return (
        <VideoPublishPage
          {...commonProps}
          onStartPublish={handleStartPublish}
          initialDraft={initialDraft}
        />
      )
    case 'ARTICLE':
      return (
        <ArticlePublishPage
          {...commonProps}
          onStartPublish={handleStartPublish}
          initialDraft={initialDraft}
        />
      )
    case 'PODCAST':
      return (
        <PodcastPublishPage
          {...commonProps}
          onStartPublish={handleStartPublish}
          initialDraft={initialDraft}
        />
      )
    case 'DYNAMIC':
    default:
      return (
        <DynamicPublishPage
          {...commonProps}
          onStartPublish={handleStartPublish}
          initialDraft={initialDraft}
        />
      )
  }
}
