import { Button } from '@heroui/react'
import { X } from 'lucide-react'
import type { PlatformType } from '../../../shared/types'
import { PLATFORMS } from '../../../shared/constants'
import { useSidebar } from './ui/sidebar'

// Sidebar width constants (must match App.tsx)
const SIDEBAR_WIDTH_EXPANDED = 256
const SIDEBAR_WIDTH_COLLAPSED = 48

export type TabStatus = 'pending' | 'filled' | 'completed' | 'failed'

interface PlatformTabBarProps {
  platforms: PlatformType[]
  statuses: Map<PlatformType, TabStatus>
  activePlatform: PlatformType | null
  onSwitch: (platform: PlatformType) => void
  onClose: (platform: PlatformType) => void
  onCloseAll: () => void
}

const STATUS_COLORS: Record<TabStatus, string> = {
  pending: 'bg-muted-foreground/50',
  filled: 'bg-yellow-500',
  completed: 'bg-green-500',
  failed: 'bg-red-500'
}

export function PlatformTabBar({
  platforms,
  statuses,
  activePlatform,
  onSwitch,
  onClose,
  onCloseAll
}: PlatformTabBarProps): React.ReactElement {
  const { state, isMobile } = useSidebar()

  // Calculate left offset based on sidebar state
  const leftOffset = isMobile ? 0 : state === 'expanded' ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED

  if (platforms.length === 0) {
    return <></>
  }

  return (
    <div
      className="h-10 bg-background border-b flex items-center gap-1 px-2 fixed top-[60px] right-0 z-50 overflow-x-auto"
      style={{ left: leftOffset }}
    >
      {/* Platform tabs */}
      <div className="flex items-center gap-1 flex-1 overflow-x-auto scrollbar-hide">
        {platforms.map((platform) => {
          const platformInfo = PLATFORMS[platform]
          const status = statuses.get(platform) || 'pending'
          const isActive = platform === activePlatform

          return (
            <div
              key={platform}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer
                transition-colors whitespace-nowrap group
                ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}
              `}
              onClick={() => onSwitch(platform)}
            >
              {/* Status indicator */}
              <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[status]}`} />

              {/* Platform name */}
              <span className="text-sm font-medium">
                {platformInfo?.name || platform}
              </span>

              {/* Close button */}
              <button
                type="button"
                className="ml-1 opacity-60 hover:opacity-100 hover:bg-muted-foreground/20 rounded p-1 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  onClose(platform)
                }}
              >
                <X className="size-3" />
              </button>
            </div>
          )
        })}
      </div>

      {/* Close all button */}
      {platforms.length > 1 && (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground shrink-0"
          onPress={onCloseAll}
        >
          关闭全部
        </Button>
      )}
    </div>
  )
}
