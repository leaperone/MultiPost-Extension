import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  Network,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  XCircle
} from 'lucide-react'
import type {
  ProxyProfile,
  ProxyProfileInput,
  ProxyProtocol,
  ProxySettings,
  ProxyTestResult
} from '@shared/types'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { ConfirmDialog } from '../ui/confirm-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../ui/dialog'
import { Input } from '../ui/input'
import { SimpleSelect } from '../ui/select'
import { toast } from '../ui/sonner'
import { Tooltip } from '../ui/tooltip'
import {
  useCreateProxy,
  useDeleteProxy,
  useProxies,
  useProxySettings,
  useUpdateProxy,
  useUpdateProxySettings
} from '../../lib/queries'

export const PROXY_NONE_VALUE = '__no_proxy__'
export const PROXY_CREATE_VALUE = '__create_proxy__'

const PROXY_PROTOCOL_OPTIONS: Array<{ value: ProxyProtocol; label: string }> = [
  { value: 'http', label: 'HTTP' },
  { value: 'https', label: 'HTTPS' },
  { value: 'socks5', label: 'SOCKS5' }
]

interface ProxyFormDraft {
  name: string
  protocol: ProxyProtocol
  host: string
  port: string
  username: string
  password: string
}

interface ProxyFieldValues {
  protocol: string
  host: string
  port: string | number
}

interface ValidatedProxyFields {
  protocol: ProxyProtocol
  host: string
  port: number
}

function hasDisallowedHostChar(value: string): boolean {
  for (const char of value) {
    const code = char.charCodeAt(0)
    if (
      code <= 31 ||
      code === 127 ||
      char.trim() === '' ||
      char === ';' ||
      char === ',' ||
      char === '|'
    ) {
      return true
    }
  }
  return false
}

export function validateProxyFields(values: ProxyFieldValues): ValidatedProxyFields {
  const protocol = values.protocol as ProxyProtocol
  const host = values.host.trim()
  const port = typeof values.port === 'number' ? values.port : Number(values.port)

  if (!PROXY_PROTOCOL_OPTIONS.some((option) => option.value === protocol)) {
    throw new Error('代理协议无效')
  }
  if (!host) {
    throw new Error('Host 不能为空')
  }
  if (hasDisallowedHostChar(host)) {
    throw new Error('Host 不能包含空白、控制字符或代理分隔符')
  }
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('Port 必须是 1 到 65535 之间的整数')
  }

  return { protocol, host, port }
}

function createProxyFormDraft(profile?: ProxyProfile | null): ProxyFormDraft {
  return {
    name: profile?.name ?? '',
    protocol: profile?.protocol ?? 'http',
    host: profile?.host ?? '',
    port: profile?.port ? String(profile.port) : '',
    username: profile?.username ?? '',
    password: ''
  }
}

function buildProxyInput(draft: ProxyFormDraft): ProxyProfileInput {
  const name = draft.name.trim()
  if (!name) {
    throw new Error('名称不能为空')
  }

  const fields = validateProxyFields({
    protocol: draft.protocol,
    host: draft.host,
    port: draft.port
  })

  return {
    name,
    protocol: fields.protocol,
    host: fields.host,
    port: fields.port,
    username: draft.username.trim(),
    password: draft.password || undefined
  }
}

function formatProxyEndpoint(profile: Pick<ProxyProfile, 'protocol' | 'host' | 'port'>): string {
  return `${profile.protocol.toUpperCase()} ${profile.host}:${profile.port}`
}

function formatProxyOption(profile: ProxyProfile): string {
  return `${profile.name} · ${formatProxyEndpoint(profile)}`
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

function renderTestResult(result: ProxyTestResult): React.ReactElement {
  if (result.ok) {
    return (
      <span className="inline-flex items-center gap-1 text-foreground">
        <CheckCircle2 className="size-3.5" />
        {typeof result.latencyMs === 'number' ? `${result.latencyMs} ms` : '连通'}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 text-destructive">
      <XCircle className="size-3.5" />
      {result.error || '测试失败'}
    </span>
  )
}

interface ProxyProfileFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile?: ProxyProfile | null
  onSaved?: (profile: ProxyProfile) => void | Promise<void>
}

export function ProxyProfileFormDialog({
  open,
  onOpenChange,
  profile,
  onSaved
}: ProxyProfileFormDialogProps): React.ReactElement {
  const [draft, setDraft] = useState<ProxyFormDraft>(() => createProxyFormDraft(profile))
  const [formError, setFormError] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<ProxyTestResult | null>(null)
  const [isTesting, setIsTesting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const createProxy = useCreateProxy()
  const updateProxy = useUpdateProxy()

  useEffect(() => {
    if (!open) return
    setDraft(createProxyFormDraft(profile))
    setFormError(null)
    setTestResult(null)
  }, [open, profile])

  const updateDraft = (patch: Partial<ProxyFormDraft>): void => {
    setDraft((current) => ({ ...current, ...patch }))
    setFormError(null)
    setTestResult(null)
  }

  const handleTest = async (): Promise<void> => {
    let input: ProxyProfileInput
    try {
      input = buildProxyInput(draft)
    } catch (error) {
      setFormError(getErrorMessage(error, '代理配置无效'))
      return
    }

    setIsTesting(true)
    setTestResult(null)
    try {
      setTestResult(await window.api.proxy.test(input))
    } catch (error) {
      setTestResult({
        ok: false,
        error: getErrorMessage(error, '无法测试代理')
      })
    } finally {
      setIsTesting(false)
    }
  }

  const handleSave = async (): Promise<void> => {
    let input: ProxyProfileInput
    try {
      input = buildProxyInput(draft)
    } catch (error) {
      setFormError(getErrorMessage(error, '代理配置无效'))
      return
    }

    setIsSaving(true)
    try {
      const saved = profile
        ? await updateProxy.mutateAsync({ id: profile.id, input })
        : await createProxy.mutateAsync(input)

      if (!saved) {
        throw new Error('代理不存在或已被删除')
      }

      await onSaved?.(saved)
      toast(profile ? '代理已保存' : '代理已创建')
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to save proxy:', error)
      toast.error(profile ? '无法保存代理' : '无法创建代理', {
        description: getErrorMessage(error, '请稍后重试')
      })
    } finally {
      setIsSaving(false)
    }
  }

  const hasSavedPassword = Boolean(profile?.hasPassword)

  return (
    <Dialog open={open} onOpenChange={(next) => !isSaving && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{profile ? '编辑代理' : '新建代理'}</DialogTitle>
          <DialogDescription>
            代理凭证只保存在本机，密码不会显示在界面中。连通性测试只验证基础 HTTPS 出口，不能保证具体平台允许登录。
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input
            label="名称"
            value={draft.name}
            onChange={(event) => updateDraft({ name: event.target.value })}
            wrapperClassName="sm:col-span-3"
            autoFocus
          />
          <SimpleSelect
            label="协议"
            value={draft.protocol}
            options={PROXY_PROTOCOL_OPTIONS}
            onValueChange={(value) => updateDraft({ protocol: value as ProxyProtocol })}
          />
          <Input
            label="Host"
            value={draft.host}
            onChange={(event) => updateDraft({ host: event.target.value })}
            wrapperClassName="sm:col-span-2"
          />
          <Input
            label="Port"
            type="number"
            value={draft.port}
            onChange={(event) => updateDraft({ port: event.target.value })}
          />
          <Input
            label="Username"
            value={draft.username}
            onChange={(event) => updateDraft({ username: event.target.value })}
          />
          <Input
            label="Password"
            type="password"
            value={draft.password}
            placeholder={
              hasSavedPassword ? '已保存；修改地址、端口或用户名需重填' : undefined
            }
            onChange={(event) => updateDraft({ password: event.target.value })}
          />
        </div>

        {formError && <p className="text-xs text-destructive">{formError}</p>}

        <DialogFooter className="items-center justify-between gap-3">
          <div className="min-w-0 flex-1 text-xs">
            {testResult ? renderTestResult(testResult) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>
              取消
            </Button>
            <Button
              variant="secondary"
              onClick={() => void handleTest()}
              isLoading={isTesting}
              disabled={isSaving}
            >
              {!isTesting && <RefreshCw />}
              测试连通性
            </Button>
            <Button onClick={() => void handleSave()} isLoading={isSaving} disabled={isTesting}>
              保存
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ProxyPage(): React.ReactElement {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProxy, setEditingProxy] = useState<ProxyProfile | null>(null)
  const [proxyToDelete, setProxyToDelete] = useState<ProxyProfile | null>(null)
  const [testingIds, setTestingIds] = useState<Set<string>>(() => new Set())
  const [testResults, setTestResults] = useState<Record<string, ProxyTestResult>>({})
  const proxiesQuery = useProxies()
  const settingsQuery = useProxySettings()
  const updateProxySettings = useUpdateProxySettings()
  const deleteProxy = useDeleteProxy()
  const proxies = proxiesQuery.data ?? []
  const settings = settingsQuery.data ?? {
    defaultProxyId: null,
    globalProxyId: null
  }
  const loading = proxiesQuery.isPending || settingsQuery.isPending

  const proxyOptions = useMemo(
    () => [
      { value: PROXY_NONE_VALUE, label: '不使用' },
      ...proxies.map((proxy) => ({ value: proxy.id, label: formatProxyOption(proxy) }))
    ],
    [proxies]
  )

  const getSelectValue = (proxyId: string | null): string => {
    if (proxyId && proxies.some((proxy) => proxy.id === proxyId)) {
      return proxyId
    }
    return PROXY_NONE_VALUE
  }

  const updateSettings = async (patch: Partial<ProxySettings>): Promise<void> => {
    try {
      await updateProxySettings.mutateAsync(patch)
      toast('代理设置已更新')
    } catch (error) {
      console.error('Failed to update proxy settings:', error)
      toast.error('无法更新代理设置', { description: '请稍后重试' })
    }
  }

  const handleTestProxy = async (proxy: ProxyProfile): Promise<void> => {
    setTestingIds((current) => new Set(current).add(proxy.id))
    setTestResults((current) => {
      const next = { ...current }
      delete next[proxy.id]
      return next
    })

    try {
      const result = await window.api.proxy.testSaved(proxy.id)
      setTestResults((current) => ({ ...current, [proxy.id]: result }))
    } catch (error) {
      setTestResults((current) => ({
        ...current,
        [proxy.id]: {
          ok: false,
          error: getErrorMessage(error, '无法测试代理')
        }
      }))
    } finally {
      setTestingIds((current) => {
        const next = new Set(current)
        next.delete(proxy.id)
        return next
      })
    }
  }

  const handleDeleteProxy = async (proxy: ProxyProfile): Promise<void> => {
    try {
      await deleteProxy.mutateAsync(proxy.id)
      toast('代理已删除')
    } catch (error) {
      console.error('Failed to delete proxy:', error)
      toast.error('无法删除代理', { description: '请稍后重试' })
    }
  }

  const openCreateDialog = (): void => {
    setEditingProxy(null)
    setIsFormOpen(true)
  }

  const openEditDialog = (proxy: ProxyProfile): void => {
    setEditingProxy(proxy)
    setIsFormOpen(true)
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
            <Network className="size-5 text-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">代理</h1>
            <p className="text-sm text-muted-foreground">
              管理账号代理池，并设置默认代理与全局代理
            </p>
          </div>
        </div>
        <Button size="sm" onClick={openCreateDialog}>
          <Plus />
          新建代理
        </Button>
      </div>

      <Card className="grid gap-4 p-5 md:grid-cols-2">
        <SimpleSelect
          label="默认代理"
          description="新建账号时自动预选，可在创建前改选。"
          value={getSelectValue(settings.defaultProxyId)}
          options={proxyOptions}
          disabled={loading}
          onValueChange={(value) =>
            void updateSettings({
              defaultProxyId: value === PROXY_NONE_VALUE ? null : value
            })
          }
        />
        <SimpleSelect
          label="全局代理"
          description="App 自身与非账号流量使用；账号流量仍按账号代理。"
          value={getSelectValue(settings.globalProxyId)}
          options={proxyOptions}
          disabled={loading}
          onValueChange={(value) =>
            void updateSettings({
              globalProxyId: value === PROXY_NONE_VALUE ? null : value
            })
          }
        />
      </Card>

      {loading ? (
        <div className="flex h-56 items-center justify-center rounded-xl bg-muted">
          <span className="text-sm text-muted-foreground">加载中...</span>
        </div>
      ) : proxies.length === 0 ? (
        <Card className="flex h-64 flex-col items-center justify-center gap-4 p-6">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Network className="size-7" />
          </div>
          <div className="text-center">
            <p className="font-medium">暂无代理</p>
            <p className="text-sm text-muted-foreground">
              新建后可在账号页选择，也可设为默认代理
            </p>
          </div>
          <Button size="sm" onClick={openCreateDialog}>
            <Plus />
            新建代理
          </Button>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-border/60">
            <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_112px_172px] items-center gap-3 px-4 py-2.5 text-xs font-medium text-muted-foreground md:grid">
              <span>代理</span>
              <span>连通性</span>
              <span>使用数</span>
              <span className="text-right">操作</span>
            </div>
            {proxies.map((proxy) => {
              const usageCount = proxy.usageCount ?? 0
              const isDefault = proxy.id === settings.defaultProxyId
              const isGlobal = proxy.id === settings.globalProxyId
              const testResult = testResults[proxy.id]
              const isTesting = testingIds.has(proxy.id)

              return (
                <div
                  key={proxy.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-foreground/[0.03] md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_112px_172px]"
                >
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium">{proxy.name}</span>
                      {isDefault && <Badge size="sm">默认</Badge>}
                      {isGlobal && <Badge size="sm">全局</Badge>}
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {formatProxyEndpoint(proxy)}
                    </p>
                  </div>

                  <div className="hidden min-w-0 text-xs text-muted-foreground md:block">
                    {isTesting ? (
                      <span className="inline-flex items-center gap-1">
                        <RefreshCw className="size-3.5 animate-spin" />
                        测试中
                      </span>
                    ) : testResult ? (
                      renderTestResult(testResult)
                    ) : (
                      <span>未测试</span>
                    )}
                  </div>

                  <div className="hidden text-sm text-muted-foreground md:block">
                    {usageCount} 个账号
                  </div>

                  <div className="flex items-center justify-end gap-0.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void handleTestProxy(proxy)}
                      isLoading={isTesting}
                    >
                      {!isTesting && <RefreshCw />}
                      测试
                    </Button>
                    <Tooltip content="编辑代理">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`编辑代理 ${proxy.name}`}
                        onClick={() => openEditDialog(proxy)}
                      >
                        <Pencil />
                      </Button>
                    </Tooltip>
                    <Tooltip content="删除代理">
                      <Button
                        size="icon-sm"
                        variant="destructive-ghost"
                        aria-label={`删除代理 ${proxy.name}`}
                        onClick={() => setProxyToDelete(proxy)}
                      >
                        <Trash2 />
                      </Button>
                    </Tooltip>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      <ProxyProfileFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        profile={editingProxy}
      />

      <ConfirmDialog
        open={proxyToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setProxyToDelete(null)
        }}
        title={`删除代理「${proxyToDelete?.name || ''}」？`}
        description={
          proxyToDelete && (proxyToDelete.usageCount ?? 0) > 0
            ? `${proxyToDelete.usageCount ?? 0} 个账号正在使用它，删除后这些账号将改为不使用代理。`
            : '删除后无法恢复，已设置的默认或全局代理也会被清空。'
        }
        confirmText="删除"
        onConfirm={async () => {
          if (proxyToDelete) {
            await handleDeleteProxy(proxyToDelete)
          }
        }}
      />
    </div>
  )
}
