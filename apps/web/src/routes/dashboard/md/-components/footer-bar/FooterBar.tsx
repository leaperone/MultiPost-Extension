'use client'

import { Button, Tooltip } from '@heroui/react'
import { Send, MonitorSmartphone, CalendarClock } from 'lucide-react'
import { useTranslation } from '@/src/i18n/client'
import { useMdDraftStore } from '@/store/md-draft.store'
import EditorActionBar from './EditorActionBar'
import PreviewerActionBar from './PreviewerActionBar'

interface FooterBarProps {
  openClientPublish: () => void
  openDirectPublish: () => void
  openPublishTask: () => void
}

export default function FooterBar({
  openClientPublish,
  openDirectPublish,
  openPublishTask,
}: FooterBarProps) {
  const { t } = useTranslation('draft')
  const activeDraftId = useMdDraftStore(s => s.activeDraftId)

  return (
    <footer className="flex h-12 shrink-0 items-center border-t bg-background px-4">
      <div className="flex flex-1 items-center">
        <EditorActionBar />
      </div>

      <div className="flex items-center gap-1">
        <Tooltip content={t('publish.modal.title')}>
          <Button
            isIconOnly
            variant="light"
            size="sm"
            isDisabled={!activeDraftId}
            onPress={openClientPublish}
          >
            <MonitorSmartphone className="size-4" />
          </Button>
        </Tooltip>

        <Tooltip content={t('publish.modal.directPublishTitle')}>
          <Button
            isIconOnly
            variant="light"
            size="sm"
            isDisabled={!activeDraftId}
            onPress={openDirectPublish}
          >
            <Send className="size-4" />
          </Button>
        </Tooltip>

        <Tooltip content={t('publish.schedule.label')}>
          <Button
            isIconOnly
            variant="light"
            size="sm"
            isDisabled={!activeDraftId}
            onPress={openPublishTask}
          >
            <CalendarClock className="size-4" />
          </Button>
        </Tooltip>
      </div>

      <div className="flex flex-1 items-center justify-end">
        <PreviewerActionBar />
      </div>
    </footer>
  )
}
