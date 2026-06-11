import { useState } from 'react'
import { Button, Checkbox, Input, Select, SelectItem } from '@heroui/react'
import { ChevronDown, ChevronRight, Network } from 'lucide-react'
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
        variant="bordered"
        className="w-full justify-between border"
        startContent={<Network className="size-4" />}
        endContent={expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        onPress={() => setExpanded((current) => !current)}
      >
        代理（可选）
      </Button>

      {expanded && (
        <div className="flex flex-col gap-3 border p-3">
          <Checkbox isSelected={value.enabled} onValueChange={(enabled) => update({ enabled })}>
            启用代理
          </Checkbox>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="协议"
              variant="bordered"
              selectedKeys={[value.protocol]}
              isDisabled={!value.enabled}
              onChange={(event) =>
                update({ protocol: (event.target.value || 'http') as ProxyConfig['protocol'] })
              }
            >
              {PROXY_PROTOCOLS.map((protocol) => (
                <SelectItem key={protocol.key}>{protocol.label}</SelectItem>
              ))}
            </Select>

            <Input
              label="Host"
              variant="bordered"
              value={value.host}
              isDisabled={!value.enabled}
              className="sm:col-span-2"
              onChange={(event) => update({ host: event.target.value })}
            />

            <Input
              label="Port"
              type="number"
              variant="bordered"
              value={value.port}
              isDisabled={!value.enabled}
              onChange={(event) => update({ port: event.target.value })}
            />

            <Input
              label="Username"
              variant="bordered"
              value={value.username}
              isDisabled={!value.enabled}
              onChange={(event) => update({ username: event.target.value })}
            />

            <Input
              label="Password"
              type="password"
              variant="bordered"
              value={value.password}
              isDisabled={!value.enabled}
              placeholder={value.hasSavedPassword ? '已保存，留空则不修改' : undefined}
              onChange={(event) => update({ password: event.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  )
}
