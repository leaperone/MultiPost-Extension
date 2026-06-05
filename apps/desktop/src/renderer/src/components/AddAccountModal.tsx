import { useEffect, useState } from 'react'
import {
  Button,
  Card,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Spinner
} from '@heroui/react'
import { X } from 'lucide-react'
import type { PlatformInfo, PlatformType } from '../../../shared/types'

interface AddAccountModalProps {
  onClose: () => void
  onAdd: (platform: PlatformType) => Promise<void>
}

const PLATFORM_ICONS: Record<string, string> = {
  weibo: '微',
  xiaohongshu: '红',
  twitter: 'X',
  douyin: '抖',
  bilibili: 'B',
  // TODO: 知乎反爬虫问题，暂时禁用
  // zhihu: '知',
  wechat: '微',
  qqmusic: 'Q',
  lizhi: '荔',
  ximalaya: '喜',
  xiaoyuzhou: '宇',
  qingting: '蜻',
  neteasepodcast: '易',
  spotify: 'S'
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
      <ModalContent className="max-w-[480px]">
        <ModalHeader className="flex items-center justify-between">
          <span className="text-lg font-semibold">添加账号</span>
          <Button variant="light" size="sm" isIconOnly onPress={onClose}>
            <X className="size-5" />
          </Button>
        </ModalHeader>

        <ModalBody className="pb-6">
          <p className="text-default-500 text-sm mb-4">选择要添加的社交媒体平台</p>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Spinner size="lg" />
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {platforms.map((platform) => (
                <Card
                  key={platform.id}
                  isPressable
                  onPress={() => onAdd(platform.id)}
                  className="flex flex-col items-center gap-2 p-4 hover:border-primary transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-default-100 flex items-center justify-center text-2xl">
                    {PLATFORM_ICONS[platform.id] || platform.id[0].toUpperCase()}
                  </div>
                  <span className="text-xs text-center">{platform.name}</span>
                </Card>
              ))}
            </div>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
