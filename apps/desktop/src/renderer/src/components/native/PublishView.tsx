import { useCallback, useEffect, useState } from 'react'
import type { Draft, PlatformType, SyncContentData, SyncContentType } from '@shared/types'

import { usePublishStore } from '../../store/publish.store'
import { useUiStore } from '../../store/ui.store'
import { DynamicPublishPage } from '../publish/DynamicPublishPage'
import { VideoPublishPage } from '../publish/VideoPublishPage'
import { ArticlePublishPage } from '../publish/ArticlePublishPage'
import { PodcastPublishPage } from '../publish/PodcastPublishPage'

/**
 * Bridges the per-content-type publish forms to the publish-group flow: the
 * created group tab takes over fill/submit progress, so the legacy in-page
 * progress card stays empty by design.
 */
export function PublishView({ contentType }: { contentType: SyncContentType }): React.ReactElement {
  const startPublish = usePublishStore((state) => state.startPublish)
  const isStarting = usePublishStore((state) => state.isStarting)
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

  const commonProps = {
    publishStates: [],
    isPublishing: isStarting
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
      return <ArticlePublishPage {...commonProps} onStartPublish={handleStartPublish} />
    case 'PODCAST':
      return <PodcastPublishPage {...commonProps} onStartPublish={handleStartPublish} />
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
