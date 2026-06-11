import {
  Settings,
  Monitor,
  Sun,
  Moon,
  LayoutGrid,
  Download,
  Activity,
  HardDriveDownload,
  HardDriveUpload,
  SquareX
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState, useCallback } from 'react'
import { UpdateChecker } from '../UpdateChecker'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Switch } from '../ui/switch'
import { SimpleSelect } from '../ui/select'
import { toast } from '../ui/sonner'
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
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 py-4">
      <div className="flex min-w-0 flex-1 basis-56 items-start gap-3">
        <div className="flex size-9 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-sm font-medium">{title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
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
    <Button variant="secondary" size="sm" onClick={() => setTheme(getNextTheme(theme))}>
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
      toast.error('无法修改开机自启动', { description: '请稍后重试' })
    }
  }

  return (
    <SettingItem icon={Monitor} title="开机自启动" description="系统启动时自动运行 MultiPost">
      <Switch checked={enabled} onCheckedChange={handleChange} disabled={!loaded} />
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
      <SimpleSelect
        value={behavior}
        onValueChange={(value) => {
          if (value === 'return' || value === 'stay') handleChange(value)
        }}
        options={[
          { value: 'return', label: '返回发布页面' },
          { value: 'stay', label: '保持浏览器区域' }
        ]}
        className="h-8 w-40 shrink-0 text-xs"
      />
    </SettingItem>
  )
}

function CloseWindowBehaviorSetting(): React.ReactElement {
  const [behavior, setBehavior] = useState<'minimize' | 'quit'>('minimize')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    window.api.app
      .getCloseBehavior()
      .then((value) => {
        setBehavior(value)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  const handleChange = async (value: 'minimize' | 'quit'): Promise<void> => {
    setBehavior(value)
    try {
      await window.api.app.setCloseBehavior(value)
    } catch (error) {
      console.error('Failed to set close behavior:', error)
      toast.error('无法修改关闭窗口行为', { description: '请稍后重试' })
    }
  }

  return (
    <SettingItem
      icon={SquareX}
      title="关闭主窗口时"
      description="保持后台运行时，会继续保持账号在线并执行定时任务"
    >
      <SimpleSelect
        value={behavior}
        onValueChange={(value) => {
          if (value === 'minimize' || value === 'quit') void handleChange(value)
        }}
        options={[
          { value: 'minimize', label: '保持后台运行' },
          { value: 'quit', label: '退出应用' }
        ]}
        disabled={!loaded}
        className="h-8 w-40 shrink-0 text-xs"
      />
    </SettingItem>
  )
}

function DataBackupSetting(): React.ReactElement {
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)

  const handleExport = async (): Promise<void> => {
    setExporting(true)
    try {
      const exported = await window.api.app.exportData()
      if (exported) {
        toast('数据备份已保存')
      }
    } catch (error) {
      console.error('Failed to export data:', error)
      toast.error('无法导出数据备份', { description: '请稍后重试' })
    } finally {
      setExporting(false)
    }
  }

  const handleImport = async (): Promise<void> => {
    setImporting(true)
    try {
      // On success the app relaunches itself, so there is no "done" toast
      await window.api.app.importData()
    } catch (error) {
      console.error('Failed to import data:', error)
      toast.error('无法导入数据备份', {
        description:
          error instanceof Error ? `${error.message}，请确认备份文件后重试` : '请确认备份文件后重试'
      })
    } finally {
      setImporting(false)
    }
  }

  return (
    <>
      <SettingItem
        icon={HardDriveDownload}
        title="导出数据备份"
        description="导出账号配置、草稿与发布历史（不含平台登录状态）"
      >
        <Button variant="secondary" size="sm" isLoading={exporting} onClick={handleExport}>
          导出
        </Button>
      </SettingItem>
      <SettingItem
        icon={HardDriveUpload}
        title="导入数据备份"
        description="导入备份会替换当前数据并重启应用"
      >
        <Button variant="secondary" size="sm" isLoading={importing} onClick={handleImport}>
          导入
        </Button>
      </SettingItem>
    </>
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
      toast('已完成一轮在线保持', {
        description: `成功 ${successCount}，失败 ${failCount}`
      })
    } catch {
      toast.error('无法保持账号在线', { description: '请稍后重试' })
    } finally {
      setTriggering(false)
    }
  }

  const description = `在后台定期访问各平台，防止登录过期${
    status?.lastRunAt ? `（上次执行 ${formatTime(status.lastRunAt)}）` : ''
  }`

  return (
    <SettingItem icon={Activity} title="保持账号在线" description={description}>
      <Button
        variant="secondary"
        size="sm"
        isLoading={triggering || (status?.isRunning ?? false)}
        onClick={handleTrigger}
      >
        {triggering || status?.isRunning ? '执行中' : '立即执行'}
      </Button>
    </SettingItem>
  )
}

export function SettingsPage(): React.ReactElement {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 xl:max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
          <Settings className="size-5 text-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">设置</h1>
          <p className="text-muted-foreground">自定义你的应用体验</p>
        </div>
      </div>

      {/* General Settings */}
      <div className="flex flex-col gap-1">
        <h2 className="px-1 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          通用设置
        </h2>
        <Card className="divide-y divide-border/60 px-5">
          <SettingItem icon={Sun} title="外观主题" description="切换浅色、深色或跟随系统">
            <ThemeSwitcher />
          </SettingItem>
          <AutoLaunchSetting />
          <CloseWindowBehaviorSetting />
          <KeepAliveSetting />
        </Card>
      </div>

      {/* Publish Settings */}
      <div className="flex flex-col gap-1">
        <h2 className="px-1 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          发布设置
        </h2>
        <Card className="divide-y divide-border/60 px-5">
          <CloseAllBehaviorSetting />
        </Card>
      </div>

      {/* Data Settings */}
      <div className="flex flex-col gap-1">
        <h2 className="px-1 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          数据与隐私
        </h2>
        <Card className="divide-y divide-border/60 px-5">
          <DataBackupSetting />
        </Card>
      </div>

      {/* Update Settings */}
      <div className="flex flex-col gap-1">
        <h2 className="px-1 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          软件更新
        </h2>
        <Card className="flex flex-col gap-4 p-5">
          <div className="flex items-start gap-3">
            <div className="flex size-9 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
              <Download className="size-4 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-medium">检查更新</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">检查是否有新版本可用</p>
            </div>
          </div>
          <UpdateChecker />
        </Card>
      </div>
    </div>
  )
}
