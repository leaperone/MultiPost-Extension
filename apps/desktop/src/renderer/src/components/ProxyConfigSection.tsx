import { useState } from 'react'
import { ChevronDown, ChevronRight, Network } from 'lucide-react'
import { Button } from './ui/button'
import { Checkbox } from './ui/checkbox'
import { Input } from './ui/input'
import { SimpleSelect } from './ui/select'
import type { ProxyConfig } from '@shared/types'

export interface ProxyConfigDraft {
  enabled: boolean
  protocol: ProxyConfig['protocol']
  host: string
  port: string
  username: string
  password: string
  /** A saved password exists in the main process but is never sent here */
  hasSavedPassword: boolean
}

const PROXY_PROTOCOLS: Array<{ key: ProxyConfig['protocol']; label: string }> = [
  { key: 'http', label: 'HTTP' },
  { key: 'https', label: 'HTTPS' },
  { key: 'socks5', label: 'SOCKS5' }
]

function hasDisallowedHostChar(value: string): boolean {
  for (const char of value) {
    const code = char.charCodeAt(0)
    if (code <= 31 || code === 127 || char.trim() === '' || char === ';' || char === ',' || char === '|') {
      return true
    }
  }
  return false
}

export function createProxyConfigDraft(proxyConfig?: ProxyConfig): ProxyConfigDraft {
  return {
    enabled: Boolean(proxyConfig),
    protocol: proxyConfig?.protocol || 'http',
    host: proxyConfig?.host || '',
    port: proxyConfig?.port ? String(proxyConfig.port) : '',
    username: proxyConfig?.username || '',
    password: proxyConfig?.password || '',
    hasSavedPassword: Boolean(proxyConfig?.hasPassword || proxyConfig?.password)
  }
}

export function proxyDraftToConfig(draft: ProxyConfigDraft): ProxyConfig | undefined {
  if (!draft.enabled) {
    return undefined
  }

  const host = draft.host.trim()
  const port = Number(draft.port)
  if (!PROXY_PROTOCOLS.some((protocol) => protocol.key === draft.protocol)) {
    throw new Error('代理协议无效')
  }
  if (!host || !Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('代理 Host 或 Port 无效')
  }
  if (hasDisallowedHostChar(host)) {
    throw new Error('代理 Host 不能包含空白、控制字符或代理分隔符')
  }

  return {
    protocol: draft.protocol,
    host,
    port,
    username: draft.username.trim() || undefined,
    password: draft.password || undefined
  }
}

interface ProxyConfigSectionProps {
  value: ProxyConfigDraft
  onChange: (value: ProxyConfigDraft) => void
  defaultExpanded?: boolean
}

export function ProxyConfigSection({
  value,
  onChange,
  defaultExpanded
}: ProxyConfigSectionProps): React.ReactElement {
  const [expanded, setExpanded] = useState(defaultExpanded ?? value.enabled)

  const update = (patch: Partial<ProxyConfigDraft>): void => {
    onChange({ ...value, ...patch })
  }

  return (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        variant="outline"
        className="w-full justify-between"
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
      >
        <span className="flex items-center gap-2">
          <Network className="size-4" />
          代理（可选）
        </span>
        {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
      </Button>

      {expanded && (
        <div className="flex flex-col gap-3 rounded-lg bg-muted/50 p-3">
          <Checkbox
            checked={value.enabled}
            onCheckedChange={(enabled) => update({ enabled: enabled === true })}
            label="启用代理"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SimpleSelect
              label="协议"
              value={value.protocol}
              disabled={!value.enabled}
              options={PROXY_PROTOCOLS.map((protocol) => ({
                value: protocol.key,
                label: protocol.label
              }))}
              onValueChange={(protocol) =>
                update({ protocol: (protocol || 'http') as ProxyConfig['protocol'] })
              }
            />

            <Input
              label="Host"
              value={value.host}
              disabled={!value.enabled}
              wrapperClassName="sm:col-span-2"
              onChange={(event) => update({ host: event.target.value })}
            />

            <Input
              label="Port"
              type="number"
              value={value.port}
              disabled={!value.enabled}
              onChange={(event) => update({ port: event.target.value })}
            />

            <Input
              label="Username"
              value={value.username}
              disabled={!value.enabled}
              onChange={(event) => update({ username: event.target.value })}
            />

            <Input
              label="Password"
              type="password"
              value={value.password}
              disabled={!value.enabled}
              placeholder={value.hasSavedPassword ? '已保存，留空则不修改' : undefined}
              onChange={(event) => update({ password: event.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  )
}
