'use client'

import { useEffect, useState } from 'react'
import { cn, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from '@heroui/react'
import { Construction } from 'lucide-react'
import { useTranslation } from '@/i18n/client'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { prepareWorker } from '@/lib/markdown-engine/worker-client'
import { useMdDraftStore } from '@/store/md-draft.store'
import CodeMirrorEditor from './editor/CodeMirrorEditor'
import DraftHeader from './editor/DraftHeader'
import MediaAttachments, { useEditorDropZone } from './editor/MediaAttachments'
import FooterBar from './footer-bar/FooterBar'
import MarkdownPreviewer from './preview/MarkdownPreviewer'
import TopTabBar from './sidebar/VerticalTabBar'
import SidebarContent from './sidebar/LeftSidebar'
import ClientPublishModal from './modals/ClientPublishModal'
import DirectPublishModal from './modals/DirectPublishModal'
import PublishTaskModal from './modals/PublishTaskModal'

export default function MdEditorClient() {
  const { t } = useTranslation('draft')
  const loadDrafts = useMdDraftStore(s => s.loadDrafts)
  const activeDraftId = useMdDraftStore(s => s.activeDraftId)
  const lastActiveTab = useMdDraftStore(s => s.lastActiveTab)

  const [betaNoticeOpen, setBetaNoticeOpen] = useState(true)
  const [clientPublishOpen, setClientPublishOpen] = useState(false)
  const [directPublishOpen, setDirectPublishOpen] = useState(false)
  const [publishTaskOpen, setPublishTaskOpen] = useState(false)

  const { isDraggingOver, dragHandlers } = useEditorDropZone()

  const isEditorTab = lastActiveTab === 'editor'

  useEffect(() => {
    prepareWorker()
  }, [])

  useEffect(() => {
    loadDrafts()
  }, [loadDrafts])

  const publishActions = {
    openClientPublish: () => setClientPublishOpen(true),
    openDirectPublish: () => setDirectPublishOpen(true),
    openPublishTask: () => setPublishTaskOpen(true),
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="flex h-full flex-col overflow-hidden">
            <TopTabBar />
            {isEditorTab
              ? (
                  <div
                    className={cn(
                      'flex flex-1 flex-col overflow-hidden bg-background',
                      isDraggingOver && 'ring-2 ring-inset ring-primary/50',
                    )}
                    {...dragHandlers}
                  >
                    <DraftHeader />
                    <div className="flex-1 overflow-hidden">
                      <CodeMirrorEditor />
                    </div>
                    <MediaAttachments
                      onShowMediaLibrary={() => useMdDraftStore.getState().setLastActiveTab('media')}
                      onShowAiImage={() => useMdDraftStore.getState().setLastActiveTab('ai-image')}
                    />
                  </div>
                )
              : (
                  <div className="flex-1 overflow-hidden">
                    <SidebarContent />
                  </div>
                )}
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={50} minSize={30}>
          <MarkdownPreviewer />
        </ResizablePanel>
      </ResizablePanelGroup>
      <FooterBar {...publishActions} />

      <Modal isOpen={betaNoticeOpen} onClose={() => setBetaNoticeOpen(false)} size="md" placement="center">
        <ModalContent>
          <ModalHeader className="flex items-center gap-2">
            <Construction className="size-5" />
            <span>{t('betaNotice.title')}</span>
          </ModalHeader>
          <ModalBody>
            <p className="text-default-600">{t('betaNotice.description')}</p>
            <p className="text-sm text-default-500">{t('betaNotice.feedbackHint')}</p>
          </ModalBody>
          <ModalFooter>
            <Button color="primary" onPress={() => setBetaNoticeOpen(false)}>
              {t('betaNotice.confirm')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ClientPublishModal isOpen={clientPublishOpen} onClose={() => setClientPublishOpen(false)} />
      <DirectPublishModal isOpen={directPublishOpen} onClose={() => setDirectPublishOpen(false)} />
      <PublishTaskModal
        isOpen={publishTaskOpen}
        onClose={() => setPublishTaskOpen(false)}
        draftId={activeDraftId || undefined}
      />
    </div>
  )
}
