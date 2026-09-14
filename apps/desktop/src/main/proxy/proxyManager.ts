import { session, type Session } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import type {
  ProxyConfig,
  ProxyProfileInput,
  ProxySettings,
  ProxyTestResult
} from '../../shared/types'
import { getDefaultProxyId, getGlobalProxyId, setProxySettings } from '../appSettings'
import { DatabaseService } from '../database'
import {
  acquireAccountProxyForSession,
  applyAccountProxy,
  releaseAccountProxyForSession,
  setAccountProxyResolver,
  type AccountProxyTarget
} from './accountProxy'
import { normalizeProxyConfig } from './proxyConfig'

interface ReapplyAccountProxy {
  (accountId: string): Promise<void>
}

const GLOBAL_PROXY_BYPASS_RULES = '<local>;localhost;127.0.0.1;[::1]'
const PROXY_TEST_URL = 'https://www.gstatic.com/generate_204'
const PROXY_TEST_TIMEOUT_MS = 8000

const registeredGlobalSessions = new Set<Session>()

function normalizeProxyProfileInput(input: ProxyProfileInput): ProxyConfig {
  const proxyConfig = normalizeProxyConfig({
    protocol: input.protocol,
    host: input.host,
    port: input.port,
    username: input.username,
    password: input.password
  })
  if (!proxyConfig) {
    throw new Error('Proxy config is required')
  }
  return proxyConfig
}

function formatProxyTestError(error: unknown): string {
  const rawMessage = error instanceof Error ? error.message : String(error)
  if (/ERR_PROXY_CONNECTION_FAILED|ERR_TUNNEL_CONNECTION_FAILED|ERR_CONNECTION_TIMED_OUT/i.test(rawMessage)) {
    return `代理连接失败：${rawMessage}`
  }
  if (/ERR_PROXY_AUTH_UNSUPPORTED|407|authentication|auth/i.test(rawMessage)) {
    return `代理认证失败，请检查用户名和密码：${rawMessage}`
  }
  if (/ERR_NAME_NOT_RESOLVED|ERR_DNS/i.test(rawMessage)) {
    return `代理或目标域名解析失败：${rawMessage}`
  }
  if (/ERR_CERT|SSL|TLS/i.test(rawMessage)) {
    return `代理 TLS 连接失败：${rawMessage}`
  }
  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return '代理测试超时，请检查代理地址、端口和网络'
    }
    return error.message
  }
  return String(error)
}

async function fetchWithTimeout(ses: Session, url: string): Promise<number> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), PROXY_TEST_TIMEOUT_MS)
  const startedAt = Date.now()

  try {
    const response = await ses.fetch(url, { signal: controller.signal })
    if (!response.ok && response.status !== 204) {
      throw new Error(`HTTP ${response.status}`)
    }
    return Date.now() - startedAt
  } finally {
    clearTimeout(timeout)
  }
}

async function reapplyAccounts(
  accountIds: string[],
  reapplyAccountProxy?: ReapplyAccountProxy
): Promise<void> {
  if (!reapplyAccountProxy) {
    return
  }

  const failures: Array<{ accountId: string; error: unknown }> = []
  await Promise.all(
    accountIds.map(async (accountId) => {
      try {
        await reapplyAccountProxy(accountId)
      } catch (error) {
        failures.push({ accountId, error })
        console.warn('[ProxyManager] Failed to reapply account proxy:', { accountId, error })
      }
    })
  )

  if (failures.length > 0) {
    throw new Error(`Failed to apply proxy to ${failures.length} account session(s)`)
  }
}

export function getAffectedAccountIds(proxyId: string): string[] {
  return DatabaseService.getInstance()
    .getAccountsByProxyId(proxyId)
    .map((account) => account.id)
}

export function resolveAccountProxyConfig(account: AccountProxyTarget): ProxyConfig | undefined {
  if (!account) {
    return undefined
  }

  if (account.proxyId) {
    const proxyConfig = DatabaseService.getInstance().getProxyConfig(account.proxyId)
    if (!proxyConfig) {
      throw new Error(`Proxy profile ${account.proxyId} is unavailable; refusing direct fallback`)
    }
    return proxyConfig
  }

  return normalizeProxyConfig(account.proxyConfig)
}

export async function initProxyManager(): Promise<void> {
  setAccountProxyResolver(resolveAccountProxyConfig)
  await registerGlobalProxySession(session.defaultSession)
}

export async function applyGlobalProxy(): Promise<void> {
  await Promise.all(Array.from(registeredGlobalSessions).map((ses) => applyGlobalProxyToSession(ses)))
}

export async function registerGlobalProxySession(ses: Session): Promise<void> {
  const isNewlyRegistered = !registeredGlobalSessions.has(ses)
  registeredGlobalSessions.add(ses)
  await applyGlobalProxyToSession(ses)
  // Hold one baseline ref on the session's proxy state so that child windows
  // opened in this non-account session (which call trackAccountProxyForWebContents
  // and release on destroy) can't drop refCount to 0 and wipe the global proxy
  // back to direct. Quit cleanup ignores refCount, so this never leaks.
  if (isNewlyRegistered) {
    await acquireAccountProxyForSession(ses)
  }
}

export async function applyGlobalProxyToSession(ses: Session): Promise<void> {
  const proxyId = getGlobalProxyId()
  const proxyConfig = proxyId ? DatabaseService.getInstance().getProxyConfig(proxyId) : undefined

  if (proxyId && !proxyConfig) {
    throw new Error(`Global proxy profile ${proxyId} is unavailable; refusing direct fallback`)
  }

  await applyAccountProxy(
    ses,
    { id: '__global__', proxyConfig },
    { bypassRules: GLOBAL_PROXY_BYPASS_RULES }
  )
}

export async function onProxyMutated(
  proxyId: string,
  reapplyAccountProxy?: ReapplyAccountProxy
): Promise<void> {
  const accountIds = getAffectedAccountIds(proxyId)
  const shouldApplyGlobalProxy = proxyId === getGlobalProxyId()

  await Promise.all([
    reapplyAccounts(accountIds, reapplyAccountProxy),
    shouldApplyGlobalProxy ? applyGlobalProxy() : Promise.resolve()
  ])
}

export async function deleteProxyAndReapply(
  proxyId: string,
  reapplyAccountProxy?: ReapplyAccountProxy
): Promise<void> {
  const affectedAccountIds = getAffectedAccountIds(proxyId)
  const wasDefaultProxy = proxyId === getDefaultProxyId()
  const wasGlobalProxy = proxyId === getGlobalProxyId()

  DatabaseService.getInstance().deleteProxy(proxyId)

  if (wasDefaultProxy || wasGlobalProxy) {
    const patch: Partial<ProxySettings> = {}
    if (wasDefaultProxy) {
      patch.defaultProxyId = null
    }
    if (wasGlobalProxy) {
      patch.globalProxyId = null
    }
    setProxySettings(patch)
  }

  let globalProxyError: unknown
  if (wasGlobalProxy) {
    try {
      await applyGlobalProxy()
    } catch (error) {
      globalProxyError = error
      console.warn('[ProxyManager] Failed to reset global proxy after deletion:', error)
    }
  }

  await reapplyAccounts(affectedAccountIds, reapplyAccountProxy)

  if (globalProxyError) {
    throw globalProxyError
  }
}

async function testProxyConfig(proxyConfig: ProxyConfig): Promise<ProxyTestResult> {
  const ses = session.fromPartition(`proxy-test:${uuidv4()}`)

  try {
    await applyAccountProxy(ses, { id: '__test__', proxyConfig })
    const latencyMs = await fetchWithTimeout(ses, PROXY_TEST_URL)
    return { ok: true, latencyMs }
  } catch (error) {
    return {
      ok: false,
      error: formatProxyTestError(error)
    }
  } finally {
    try {
      await releaseAccountProxyForSession(ses)
    } catch (error) {
      console.warn('[ProxyManager] Failed to release proxy test session:', error)
    }
  }
}

export async function testProxy(input: ProxyProfileInput): Promise<ProxyTestResult> {
  return testProxyConfig(normalizeProxyProfileInput(input))
}

export async function testSavedProxy(proxyId: string): Promise<ProxyTestResult> {
  const proxyConfig = DatabaseService.getInstance().getProxyConfig(proxyId)
  if (!proxyConfig) {
    return { ok: false, error: 'Proxy profile not found' }
  }
  return testProxyConfig(proxyConfig)
}
