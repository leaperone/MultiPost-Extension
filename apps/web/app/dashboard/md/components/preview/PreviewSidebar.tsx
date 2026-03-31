'use client'

import { Button, Tooltip, Divider } from '@heroui/react'
import { Monitor, Moon, Smartphone, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useMdPreviewStore, PREVIEW_WIDTH_MOBILE, PREVIEW_WIDTH_DESKTOP } from '@/store/md-preview.store'

export default function PreviewSidebar() {
  const previewWidth = useMdPreviewStore(s => s.previewWidth)
  const setUserPreferredWidth = useMdPreviewStore(s => s.setUserPreferredWidth)
  const { theme, setTheme } = useTheme()

  const isDark = theme === 'dark'
  const isMobileView = previewWidth === PREVIEW_WIDTH_MOBILE
  const isDesktopView = previewWidth === PREVIEW_WIDTH_DESKTOP

  const handleThemeToggle = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  return (
    <div className="flex w-11 flex-col items-center border-l py-2">
      <Tooltip content={isDark ? '切换到浅色模式' : '切换到深色模式'} placement="left">
        <Button
          isIconOnly
          variant="light"
          size="sm"
          aria-label="切换主题"
          onPress={handleThemeToggle}
        >
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
      </Tooltip>

      <Divider className="my-1 w-6" />

      <Tooltip content="移动端视图" placement="left">
        <Button
          isIconOnly
          variant="light"
          size="sm"
          aria-label="移动端视图"
          onPress={() => setUserPreferredWidth(PREVIEW_WIDTH_MOBILE)}
        >
          <Smartphone className={`size-4 ${isMobileView ? 'text-primary' : ''}`} />
        </Button>
      </Tooltip>

      <Tooltip content="桌面端视图" placement="left">
        <Button
          isIconOnly
          variant="light"
          size="sm"
          aria-label="桌面端视图"
          onPress={() => setUserPreferredWidth(PREVIEW_WIDTH_DESKTOP)}
        >
          <Monitor className={`size-4 ${isDesktopView ? 'text-primary' : ''}`} />
        </Button>
      </Tooltip>

      <div className="flex-1" />
    </div>
  )
}
