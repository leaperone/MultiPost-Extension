import { useEffect, useState } from 'react'
import {
  Button,
  Card,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Spinner
} from '@heroui/react'
import { X } from 'lucide-react'
import { CONTENT_TYPE_LABELS, getPlatformAccountKey } from '../../../shared/constants'
import type { PlatformInfo, PlatformType } from '../../../shared/types'
import { PlatformIcon } from './publish/shared'

interface AddAccountModalProps {
  onClose: () => void
  onAdd: (platform: PlatformType) => Promise<void>
}

export function AddAccountModal({ onClose, onAdd }: AddAccountModalProps): React.ReactElement {
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.api.app.getPlatforms().then((list) => {
      setPlatforms(list)
      setLoading(false)
    })
  }, [])

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()}>
      <ModalContent className="max-w-[720px]">
        <ModalHeader className="flex items-center justify-between">
          <span className="text-lg font-semibold">添加账号</span>
          <Button variant="light" size="sm" isIconOnly onPress={onClose}>
            <X className="size-5" />
          </Button>
        </ModalHeader>

        <ModalBody className="pb-6 flex flex-col gap-4">
          <p className="text-default-500 text-sm">选择要添加的社交媒体平台</p>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Spinner size="lg" />
            </div>
          ) : (
            <div className="grid max-h-[60vh] grid-cols-1 gap-3 overflow-auto sm:grid-cols-2 lg:grid-cols-3">
              {platforms.map((platform) => (
                <Card
                  key={platform.id}
                  isPressable
                  onPress={() => onAdd(platform.id)}
                  className="flex flex-row items-start gap-3 p-3 text-left hover:border-primary transition-colors"
                >
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border bg-default-50">
                    <PlatformIcon platform={platform.id} size={24} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{platform.name}</div>
                    <div className="mt-1 truncate text-xs text-default-500">
                      {getPlatformAccountKey(platform.id)}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {platform.supportedContentTypes.map((contentType) => (
                        <Chip key={contentType} size="sm" variant="flat" className="h-6 px-1">
                          {CONTENT_TYPE_LABELS[contentType]}
                        </Chip>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
