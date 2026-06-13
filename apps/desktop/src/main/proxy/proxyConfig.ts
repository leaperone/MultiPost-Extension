import { isIP } from 'net'
import { domainToASCII } from 'url'
import type { ProxyConfig } from '../../shared/types'

const proxyProtocols = new Set<ProxyConfig['protocol']>(['http', 'https', 'socks5'])

export function hasDisallowedHostChar(value: string): boolean {
  for (const char of value) {
    const code = char.charCodeAt(0)
    if (code <= 31 || code === 127 || char.trim() === '' || char === ';' || char === ',' || char === '|') {
      return true
    }
  }
  return false
}

export function assertValidHostname(host: string): string {
  const asciiHost = domainToASCII(host)
  if (!asciiHost || asciiHost.length > 253 || hasDisallowedHostChar(asciiHost)) {
    throw new Error('Proxy host must be a valid hostname, IPv4, or IPv6 address')
  }

  const labels = asciiHost.endsWith('.') ? asciiHost.slice(0, -1).split('.') : asciiHost.split('.')
  if (labels.length === 0) {
    throw new Error('Proxy host must be a valid hostname, IPv4, or IPv6 address')
  }

  for (const label of labels) {
    if (
      label.length < 1 ||
      label.length > 63 ||
      !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(label)
    ) {
      throw new Error('Proxy host must be a valid hostname, IPv4, or IPv6 address')
    }
  }

  return asciiHost
}

export function normalizeProxyHost(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('Proxy host is required')
  }

  const trimmed = value.trim()
  if (!trimmed) {
    throw new Error('Proxy host is required')
  }
  if (hasDisallowedHostChar(trimmed)) {
    throw new Error('Proxy host must not contain whitespace, control characters, or proxy separators')
  }

  const unbracketed =
    trimmed.startsWith('[') && trimmed.endsWith(']') ? trimmed.slice(1, -1) : trimmed
  if (isIP(unbracketed)) {
    return unbracketed
  }

  return assertValidHostname(trimmed)
}

export function normalizeProxyPort(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error('Proxy port must be an integer between 1 and 65535')
  }
  return value
}

export function normalizeProxyConfig(value: unknown): ProxyConfig | undefined {
  if (value == null) {
    return undefined
  }
  if (typeof value !== 'object') {
    throw new Error('Proxy config must be an object')
  }

  const candidate = value as Partial<ProxyConfig>
  if (!proxyProtocols.has(candidate.protocol as ProxyConfig['protocol'])) {
    throw new Error('Proxy protocol must be http, https, or socks5')
  }

  const username =
    typeof candidate.username === 'string' && candidate.username.length > 0
      ? candidate.username
      : undefined
  const password =
    typeof candidate.password === 'string' && candidate.password.length > 0
      ? candidate.password
      : undefined

  return {
    protocol: candidate.protocol as ProxyConfig['protocol'],
    host: normalizeProxyHost(candidate.host),
    port: normalizeProxyPort(candidate.port),
    username,
    password
  }
}

export function formatProxyHost(host: string): string {
  return isIP(host) === 6 ? `[${host}]` : host
}

export function getProxyRules(proxyConfig: ProxyConfig): string {
  return `${proxyConfig.protocol}://${formatProxyHost(proxyConfig.host)}:${proxyConfig.port}`
}

export function buildProxyMigrationKey(config: ProxyConfig): string {
  const normalized = normalizeProxyConfig(config)
  if (!normalized) {
    throw new Error('Proxy config is required')
  }

  return JSON.stringify([
    normalized.protocol,
    normalized.host,
    normalized.port,
    normalized.username ?? '',
    normalized.password ??
      (typeof config.encryptedPassword === 'string' ? config.encryptedPassword : '')
  ])
}
