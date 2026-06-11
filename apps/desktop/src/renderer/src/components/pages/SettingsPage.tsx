import { Settings, Monitor, Database, Sun, Moon, LayoutGrid, Download, Activity } from 'lucide-react'
import { Switch, Button, Select, SelectItem, addToast } from '@heroui/react'
import { useTheme } from 'next-themes'
import { useEffect, useState, useCallback } from 'react'
import { UpdateChecker } from '../UpdateChecker'
import type { KeepAliveStatus } from '../../../../shared/types'

// Settings keys
const CLOSE_ALL_BEHAVIOR_KEY = 'multipost:closeAllBehavior'

type CloseAllBehavior = 'return' | 'stay'

interface SettingItemProps {
  icon: React.ElementType
  title: string
  description: string
  children?: React.ReactNode
}

function SettingItem({ icon: Icon, title, description, children }: SettingItemProps): React.ReactElement {
  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex items-start gap-3">
        <div className="size-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-medium text-sm">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

const themeOrder = ['light', 'dark', 'system'] as const
const themeLabels: Record<string, string> = {
  light: '浅色',
  dark: '深色',
  system: '跟随系统'
}

function getNextTheme(current: string | undefined): string {
  const currentIndex = themeOrder.indexOf(current as (typeof themeOrder)[number])
  return themeOrder[(currentIndex + 1) % themeOrder.length]
}

function ThemeIcon({
  theme,
  resolvedTheme
}: {
  theme: string | undefined
  resolvedTheme: string | undefined
}): React.ReactElement {
  if (theme === 'system') return <Monitor className="size-4" />
  if (resolvedTheme === 'light') return <Sun className="size-4" />
  return <Moon className="size-4" />
}

function ThemeSwitcher(): React.ReactElement | null {
  const [mounted, setMounted] = useState(false)
  const { theme, resolvedTheme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <Button variant="flat" size="sm" onPress={() => setTheme(getNextTheme(theme))}>
      <ThemeIcon theme={theme} resolvedTheme={resolvedTheme} />
      <span>{themeLabels[theme || 'system']}</span>
    </Button>
  )
}

function AutoLaunchSetting(): React.ReactElement {
  const [enabled, setEnabled] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    window.api.app
      .getAutoLaunch()
      .then((value) => {
        setEnabled(value)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  const handleChange = async (value: boolean): Promise<void> => {
    setEnabled(value)
    try {
      const applied = await window.api.app.setAutoLaunch(value)
      setEnabled(applied)
    } catch (error) {
      console.error('Failed to set auto launch:', error)
      setEnabled(!value)
      addToast({ title: '设置失败', description: '无法修改开机自启动', hideIcon: true })
    }
  }

  return (
    <SettingItem icon={Monitor} title="开机自启动" description="系统启动时自动运行 MultiPost">
      <Switch size="sm" isSelected={enabled} onValueChange={handleChange} isDisabled={!loaded} />
    </SettingItem>
  )
}

function CloseAllBehaviorSetting(): React.ReactElement {
  const [behavior, setBehavior] = useState<CloseAllBehavior>('return')

  useEffect(() => {
    const saved = localStorage.getItem(CLOSE_ALL_BEHAVIOR_KEY) as CloseAllBehavior | null
    if (saved === 'return' || saved === 'stay') {
      setBehavior(saved)
    }
  }, [])

  const handleChange = (value: CloseAllBehavior) => {
    setBehavior(value)
    localStorage.setItem(CLOSE_ALL_BEHAVIOR_KEY, value)
  }

  return (
    <SettingItem
      icon={LayoutGrid}
      title="关闭所有标签后"
      description="选择关闭所有平台标签后的行为"
    >
      <Select
        size="sm"
        selectedKeys={[behavior]}
        onSelectionChange={(keys) => {
          const selected = Array.from(keys)[0] as CloseAllBehavior
          if (selected) handleChange(selected)
        }}
        className="w-36"
        aria-label="关闭所有标签后的行为"
      >
        <SelectItem key="return">返回发布页面</SelectItem>
        <SelectItem key="stay">保持浏览器区域</SelectItem>
      </Select>
    </SettingItem>
  )
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function KeepAliveSetting(): React.ReactElement {
  const [status, setStatus] = useState<KeepAliveStatus | null>(null)
  const [triggering, setTriggering] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      const s = await window.api.keepAlive.getStatus()
      setStatus(s)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const handleTrigger = async (): Promise<void> => {
    setTriggering(true)
    try {
      const result = await window.api.keepAlive.trigger()
      setStatus(result)
      const successCount = result.lastResults.filter((r) => r.success).length
      const failCount = result.lastResults.filter((r) => !r.success).length
      addToast({
        title: '保活完成',
        description: `成功 ${successCount}，失败 ${failCount}`,
        hideIcon: true
      })
    } catch {
      addToast({ title: '保活失败', description: '执行保活任务时出错', hideIcon: true })
    } finally {
      setTriggering(false)
    }
  }

  const description = status?.lastRunAt
    ? `上次执行: ${formatTime(status.lastRunAt)}`
    : '定期访问平台保持登录状态'

  return (
    <SettingItem icon={Activity} title="账号保活" description={description}>
      <Button
        variant="flat"
        size="sm"
        isLoading={triggering || (status?.isRunning ?? false)}
        onPress={handleTrigger}
      >
        {triggering || status?.isRunning ? '执行中' : '立即执行'}
      </Button>
    </SettingItem>
  )
}

export function SettingsPage(): React.ReactElement {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Settings className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">设置</h1>
            <p className="text-muted-foreground">自定义你的应用体验</p>
          </div>
        </div>
      </div>

      {/* General Settings */}
      <div className="space-y-1">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider px-1">
          通用设置
        </h2>
        <div className="bg-card rounded-lg border border-border px-4 divide-y divide-border">
          <SettingItem icon={Sun} title="外观主题" description="切换浅色、深色或跟随系统">
            <ThemeSwitcher />
          </SettingItem>
          <AutoLaunchSetting />
          <KeepAliveSetting />
        </div>
      </div>

      {/* Publish Settings */}
      <div className="space-y-1">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider px-1">
          发布设置
        </h2>
        <div className="bg-card rounded-lg border border-border px-4 divide-y divide-border">
          <CloseAllBehaviorSetting />
        </div>
      </div>

      {/* Data Settings */}
      <div className="space-y-1">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider px-1">
          数据与隐私
        </h2>
        <div className="bg-card rounded-lg border border-border px-4 divide-y divide-border">
          <SettingItem
            icon={Database}
            title="本地数据存储"
            description="所有数据均存储在本地，不会上传到云端"
          >
            <span className="text-xs text-muted-foreground">已启用</span>
          </SettingItem>
        </div>
      </div>

      {/* Update Settings */}
      <div className="space-y-1">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider px-1">
          软件更新
        </h2>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="size-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Download className="size-4 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-medium text-sm">检查更新</h3>
              <p className="text-xs text-muted-foreground mt-0.5">检查是否有新版本可用</p>
            </div>
          </div>
          <UpdateChecker />
        </div>
      </div>

      {/* Note */}
      <p className="text-xs text-center text-muted-foreground">
        更多设置功能正在开发中...
      </p>
    </div>
  )
}
