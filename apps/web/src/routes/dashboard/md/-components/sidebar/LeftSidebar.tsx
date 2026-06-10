'use client'

import { addToast } from '@heroui/react'
import { nanoid } from 'nanoid'
import { useMdDraftStore } from '@/store/md-draft.store'
import { useTranslation } from '@/src/i18n/client'
import DraftList from './DraftList'
import ChatCreationPanel from './ChatCreationPanel'
import MediaLibrary from '../../../drafts/-components/MediaLibrary'
import { ImageGeneratePanel } from '../../../drafts/-components/ImageGeneratePanel'
import { PosterGeneratePanel } from '../../../drafts/-components/PosterGeneratePanel'
import type { FileHosting } from '@/prisma/client_multipost'

export default function SidebarContent() {
  const { t } = useTranslation('draft')
  const lastActiveTab = useMdDraftStore(s => s.lastActiveTab)
  const activeDraftId = useMdDraftStore(s => s.activeDraftId)
  const currentTitle = useMdDraftStore(s => s.currentTitle)
  const currentContent = useMdDraftStore(s => s.currentContent)
  const addFile = useMdDraftStore(s => s.addFile)

  const handleSelectImage = async (imageFile: FileHosting) => {
    if (!activeDraftId) {
      addToast({ title: t('toast.selectDraftFirst'), color: 'warning' })
      return
    }

    try {
      let imageUrl = imageFile.previewUrl
      if (!imageUrl) {
        const response = await fetch(`/api/v1/file/${imageFile.id}/preview`)
        const data = await response.json()
        if (data.code === 0) {
          imageUrl = data.data.previewUrl
        }
      }

      if (!imageUrl) {
        addToast({ title: t('toast.cannotGetImageUrl'), color: 'danger' })
        return
      }

      addFile({
        rid: nanoid(),
        source: 'mp_oss',
        name: imageFile.filename || `image-${imageFile.id.slice(-8)}`,
        url: imageUrl,
        type: imageFile.type || 'image/jpeg',
        size: imageFile.size,
        uploadProgress: 100,
      })

      addToast({ title: t('toast.imageAddedSuccess'), color: 'success' })
    } catch (error) {
      console.error('Failed to add image to draft:', error)
      addToast({ title: t('toast.imageAddFailed'), color: 'danger' })
    }
  }

  const handleInsertImage = async (imageUrl: string, prefix: string) => {
    if (!activeDraftId) {
      addToast({ title: t('toast.selectDraftFirst'), color: 'warning' })
      return
    }

    try {
      addToast({ title: t('toast.insertingImage'), color: 'default' })
      const response = await fetch(imageUrl)
      const blob = await response.blob()

      addFile({
        rid: nanoid(),
        source: 'generated',
        name: `${prefix}-${nanoid(8)}.${blob.type.split('/')[1] || 'png'}`,
        url: imageUrl,
        type: blob.type,
        size: blob.size,
        uploadProgress: 100,
      })

      addToast({ title: t('toast.imageInsertedSuccess'), color: 'success' })
    } catch (error) {
      console.error(`Failed to insert ${prefix}:`, error)
      addToast({ title: t('toast.imageInsertFailed'), color: 'danger' })
    }
  }

  // "editor" tab is handled by parent — this component only renders non-editor panels
  if (lastActiveTab === 'editor') return null

  return (
    <div className="h-full overflow-hidden">
      {lastActiveTab === 'drafts' && <DraftList />}
      {lastActiveTab === 'ai-polish' && <ChatCreationPanel />}
      {lastActiveTab === 'ai-image' && (
        <div className="h-full overflow-y-auto p-4">
          <ImageGeneratePanel
            draftTitle={currentTitle}
            draftContent={currentContent}
            onInsertImage={(url) => handleInsertImage(url, 'generated-image')}
          />
        </div>
      )}
      {lastActiveTab === 'ai-poster' && (
        <div className="h-full overflow-y-auto p-4">
          <PosterGeneratePanel
            draftTitle={currentTitle}
            draftContent={currentContent}
            onInsertImage={(url) => handleInsertImage(url, 'generated-poster')}
          />
        </div>
      )}
      {lastActiveTab === 'media' && (
        <div className="h-full overflow-y-auto p-4">
          <MediaLibrary onSelectImage={handleSelectImage} />
        </div>
      )}
    </div>
  )
}
