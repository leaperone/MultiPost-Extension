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
  RefreshCw,
  SquareX,
  Timer,
  Bug,
  FolderOpen,
  Plug,
  KeyRound,
  Copy,
  Eye,
  EyeOff,
  ShieldCheck
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { UpdateChecker } from '../UpdateChecker'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Switch } from '../ui/switch'
import { Input } from '../ui/input'
import { SimpleSelect } from '../ui/select'
import { toast } from '../ui/sonner'
import { ConfirmDialog } from '../ui/confirm-dialog'
import { setDebugLogEnabled as setRendererDebugLogEnabled } from '../../lib/logger'
import type {
  ExternalApiSettings,
  KeepAliveAccountResult,
  KeepAliveStatus
} from '../../../../shared/types'

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

function DebugLogSetting(): React.ReactElement {
  const [enabled, setEnabled] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    window.api.debugLog
      .get()
      .then((value) => {
        setEnabled(value)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  const handleChange = async (value: boolean): Promise<void> => {
    setEnabled(value)
    try {
      const applied = await window.api.debugLog.set(value)
      setEnabled(applied)
      setRendererDebugLogEnabled(applied)
    } catch (error) {
      console.error('Failed to set debug log:', error)
      setEnabled(!value)
      toast.error('无法修改调试日志设置', { description: '请稍后重试' })
    }
  }

  const handleOpenLogsDir = async (): Promise<void> => {
    try {
      await window.api.debugLog.openLogsDir()
    } catch (error) {
      console.error('Failed to open logs dir:', error)
      toast.error('无法打开日志文件夹', { description: '请稍后重试' })
    }
  }

  return (
    <>
      <SettingItem
        icon={Bug}
        title="调试日志"
        description={
          enabled
            ? '正在记录详细日志，问题定位完成后建议关闭'
            : '开启后记录详细的运行日志，用于排查问题'
        }
      >
        <Switch checked={enabled} onCheckedChange={handleChange} disabled={!loaded} />
      </SettingItem>
      <SettingItem
        icon={FolderOpen}
        title="日志文件"
        description="日志按模块拆分为主程序、界面、发布、保活、通信五个文件，反馈问题时可打包发送"
      >
        <Button variant="secondary" size="sm" onClick={() => void handleOpenLogsDir()}>
          打开日志文件夹
        </Button>
      </SettingItem>
    </>
  )
}

function TelemetrySetting(): React.ReactElement {
  const [enabled, setEnabled] = useState(true)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    window.api.telemetry
      .get()
      .then((value) => {
        setEnabled(value)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  const handleChange = async (value: boolean): Promise<void> => {
    setEnabled(value)
    try {
      const applied = await window.api.telemetry.set(value)
      setEnabled(applied)
    } catch (error) {
      console.error('Failed to set telemetry:', error)
      setEnabled(!value)
      toast.error('无法修改错误上报设置', { description: '请稍后重试' })
    }
  }

  return (
    <SettingItem
      icon={ShieldCheck}
      title="崩溃与错误上报"
      description="匿名上报崩溃和错误以帮助我们修复问题，已自动脱敏账号、Cookie 等隐私数据，随时可关"
    >
      <Switch checked={enabled} onCheckedChange={handleChange} disabled={!loaded} />
    </SettingItem>
  )
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

const KEEPALIVE_INTERVAL_OPTIONS = [
  { value: '1', label: '每 1 小时' },
  { value: '2', label: '每 2 小时' },
  { value: '4', label: '每 4 小时' },
  { value: '8', label: '每 8 小时' },
  { value: '12', label: '每 12 小时' }
]

// "online / logged-out / unknown" buckets: a failed visit or a failed login
// check both mean "we couldn't confirm", never "logged out".
function describeKeepAliveResults(results: KeepAliveAccountResult[]): string | null {
  if (results.length === 0) return null
  const online = results.filter((r) => r.success && r.stillLoggedIn && !r.checkFailed).length
  const loggedOut = results.filter((r) => r.success && !r.stillLoggedIn && !r.checkFailed)
  const unknown = results.length - online - loggedOut.length
  const parts = [`${online} 个在线`]
  if (loggedOut.length > 0) {
    parts.push(`${loggedOut.length} 个掉线（${loggedOut.map((r) => r.displayName).join('、')}）`)
  }
  if (unknown > 0) {
    parts.push(`${unknown} 个状态未知`)
  }
  return parts.join('，')
}

function formatEta(ts: number): string {
  const diffMinutes = Math.max(1, Math.round((ts - Date.now()) / 60000))
  if (diffMinutes < 60) return `约 ${diffMinutes} 分钟后`
  return `约 ${Math.round(diffMinutes / 60)} 小时后`
}

function KeepAliveSetting(): React.ReactElement {
  const [status, setStatus] = useState<KeepAliveStatus | null>(null)
  const [triggering, setTriggering] = useState(false)

  useEffect(() => {
    let cancelled = false
    window.api.keepAlive
      .getStatus()
      .then((s) => {
        if (!cancelled) setStatus(s)
      })
      .catch(() => {
        // ignore
      })
    const unsubscribe = window.api.keepAlive.onStatusChanged(setStatus)
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  const handleToggle = async (enabled: boolean): Promise<void> => {
    setStatus((prev) => (prev ? { ...prev, enabled } : prev))
    try {
      setStatus(await window.api.keepAlive.setConfig({ enabled }))
    } catch (error) {
      console.error('Failed to set keep-alive enabled:', error)
      setStatus((prev) => (prev ? { ...prev, enabled: !enabled } : prev))
      toast.error('无法修改自动保活设置', { description: '请稍后重试' })
    }
  }

  const handleIntervalChange = async (value: string): Promise<void> => {
    const intervalHours = Number(value)
    if (!Number.isInteger(intervalHours)) return
    try {
      setStatus(await window.api.keepAlive.setConfig({ intervalHours }))
    } catch (error) {
      console.error('Failed to set keep-alive interval:', error)
      toast.error('无法修改保活间隔', { description: '请稍后重试' })
    }
  }

  const handleTrigger = async (): Promise<void> => {
    setTriggering(true)
    try {
      const result = await window.api.keepAlive.trigger()
      setStatus(result)
      toast('已完成一轮在线保持', {
        description: describeKeepAliveResults(result.lastResults) ?? '没有已登录的账号'
      })
    } catch {
      toast.error('无法保持账号在线', { description: '请稍后重试' })
    } finally {
      setTriggering(false)
    }
  }

  const enabled = status?.enabled ?? true
  const isBusy = triggering || (status?.isRunning ?? false)

  const autoDescription = enabled
    ? `定期在后台访问各平台刷新登录状态，掉线时会提醒你${
        status?.nextRunAt ? `（下次执行${formatEta(status.nextRunAt)}）` : ''
      }`
    : '已关闭，平台登录状态可能在数天内过期'

  const lastRunSummary = status?.lastRunAt
    ? `上次执行 ${formatTime(status.lastRunAt)}${(() => {
        const summary = describeKeepAliveResults(status.lastResults)
        return summary ? `：${summary}` : '，没有已登录的账号'
      })()}`
    : '手动执行一轮保活，并检测所有账号的登录状态'

  return (
    <>
      <SettingItem icon={Activity} title="自动保持账号在线" description={autoDescription}>
        <Switch checked={enabled} onCheckedChange={handleToggle} disabled={!status} />
      </SettingItem>
      {enabled && (
        <SettingItem
          icon={Timer}
          title="保活间隔"
          description="实际执行时间会在所选间隔上下随机浮动，更接近真人使用习惯"
        >
          <SimpleSelect
            value={String(status?.intervalHours ?? 4)}
            onValueChange={(value) => {
              void handleIntervalChange(value)
            }}
            options={KEEPALIVE_INTERVAL_OPTIONS}
            disabled={!status}
            className="h-8 w-32 shrink-0 text-xs"
          />
        </SettingItem>
      )}
      <SettingItem icon={RefreshCw} title="立即执行一轮" description={lastRunSummary}>
        <Button variant="secondary" size="sm" isLoading={isBusy} onClick={handleTrigger}>
          {isBusy ? '执行中' : '立即执行'}
        </Button>
      </SettingItem>
    </>
  )
}

function maskToken(token: string): string {
  if (token.length <= 12) return token
  return `${token.slice(0, 6)}${'•'.repeat(8)}${token.slice(-4)}`
}

function ExternalApiSetting(): React.ReactElement {
  const [settings, setSettings] = useState<ExternalApiSettings | null>(null)
  const [toggling, setToggling] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [regenerateOpen, setRegenerateOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    window.api.externalApi
      .getSettings()
      .then((value) => {
        if (!cancelled) setSettings(value)
      })
      .catch(() => {
        // ignore
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleToggle = async (enabled: boolean): Promise<void> => {
    setToggling(true)
    setSettings((prev) => (prev ? { ...prev, enabled } : prev))
    try {
      const next = await window.api.externalApi.setSettings({ enabled })
      setSettings(next)
      toast(enabled ? '外部 API 已开启' : '外部 API 已关闭')
    } catch (error) {
      setSettings((prev) => (prev ? { ...prev, enabled: !enabled } : prev))
      toast.error('无法切换外部 API', {
        description: error instanceof Error ? error.message : '请稍后重试'
      })
    } finally {
      setToggling(false)
    }
  }

  const handleCopy = async (text: string, label: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text)
      toast(`${label}已复制`)
    } catch {
      toast.error('复制失败', { description: '请手动选择复制' })
    }
  }

  const handleRegenerate = async (): Promise<void> => {
    try {
      const next = await window.api.externalApi.regenerateToken()
      setSettings(next)
      setRevealed(true)
      toast('已重新生成访问令牌', { description: '旧令牌已立即失效' })
    } catch {
      toast.error('无法重新生成令牌', { description: '请稍后重试' })
    }
  }

  const enabled = settings?.enabled ?? false
  const baseUrl = settings ? `http://127.0.0.1:${settings.port}` : ''
  const token = settings?.token ?? ''
  const mcpConfig = settings
    ? JSON.stringify(
        {
          mcpServers: {
            'multipost-desktop': {
              url: `${baseUrl}/mcp`,
              headers: { Authorization: `Bearer ${token}` }
            }
          }
        },
        null,
        2
      )
    : ''

  return (
    <>
      <SettingItem
        icon={Plug}
        title="开启外部 API"
        description="在本机暴露 HTTP 接口与 MCP 服务，供脚本或 AI 工具拉取账号、创建发布任务。仅监听 127.0.0.1"
      >
        <Switch checked={enabled} onCheckedChange={handleToggle} disabled={!settings || toggling} />
      </SettingItem>

      {enabled && settings && (
        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">服务地址</span>
            <div className="flex items-center gap-2">
              <Input readOnly value={baseUrl} className="h-8 font-mono text-xs" />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void handleCopy(baseUrl, '服务地址')}
              >
                <Copy className="size-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">访问令牌（Bearer Token）</span>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={revealed ? token : maskToken(token)}
                className="h-8 font-mono text-xs"
              />
              <Button variant="secondary" size="sm" onClick={() => setRevealed((v) => !v)}>
                {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void handleCopy(token, '访问令牌')}
              >
                <Copy className="size-4" />
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setRegenerateOpen(true)}>
                <KeyRound className="size-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              请求需携带 <code className="rounded bg-muted px-1 py-0.5">Authorization: Bearer …</code>
              。请妥善保管，泄露后可重新生成令牌使旧令牌失效。
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                MCP 接入配置（Claude Code / Cursor 等）
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void handleCopy(mcpConfig, 'MCP 配置')}
              >
                <Copy className="size-4" />
                复制
              </Button>
            </div>
            <pre className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs text-muted-foreground">
              {mcpConfig}
            </pre>
            <p className="text-xs text-muted-foreground">
              完整接口文档见{' '}
              <button
                type="button"
                className="underline underline-offset-2"
                onClick={() =>
                  window.api.browser.openWebDashboard('/docs/api-reference/desktop')
                }
              >
                使用文档
              </button>
              。
            </p>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={regenerateOpen}
        onOpenChange={setRegenerateOpen}
        title="重新生成访问令牌？"
        description="当前令牌将立即失效，所有使用旧令牌的脚本或工具都需要更新为新令牌。"
        confirmText="重新生成"
        onConfirm={handleRegenerate}
      />
    </>
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

      {/* External API */}
      <div className="flex flex-col gap-1">
        <h2 className="px-1 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          外部 API
        </h2>
        <Card className="divide-y divide-border/60 px-5">
          <ExternalApiSetting />
        </Card>
      </div>

      {/* Data Settings */}
      <div className="flex flex-col gap-1">
        <h2 className="px-1 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          数据与隐私
        </h2>
        <Card className="divide-y divide-border/60 px-5">
          <TelemetrySetting />
          <DataBackupSetting />
          <DebugLogSetting />
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
