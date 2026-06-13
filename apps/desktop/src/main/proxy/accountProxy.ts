import type { Session, WebContents } from 'electron'
import type { Account, ProxyConfig } from '../../shared/types'
import { formatProxyHost, getProxyRules, normalizeProxyConfig } from './proxyConfig'

interface AccountProxySessionState {
  key: string
  proxyRules?: string
  bypassRules?: string
  anonymizedProxyUrl?: string
  accountId?: string
  refCount: number
  generation: number
}

type ProxyChainModule = typeof import('proxy-chain')
export type AccountProxyTarget = Pick<Account, 'id' | 'proxyId' | 'proxyConfig'> | null | undefined
export type AccountProxyResolver = (account: AccountProxyTarget) => ProxyConfig | undefined

export interface ApplyAccountProxyOptions {
  bypassRules?: string
}

interface ProxyApplyResult {
  superseded: boolean
}

const proxyStateBySession: Map<Session, AccountProxySessionState> = new Map()
const trackedWebContentsSessions: Map<number, Session> = new Map()
const proxyOperationQueues: WeakMap<Session, Promise<void>> = new WeakMap()
const latestApplyGenerationBySession: WeakMap<Session, number> = new WeakMap()

let proxyChainModule: Promise<ProxyChainModule> | null = null
let accountProxyResolver: AccountProxyResolver = (account) =>
  normalizeProxyConfig(account?.proxyConfig)

export function setAccountProxyResolver(fn: AccountProxyResolver): void {
  accountProxyResolver = fn
}

function loadProxyChain(): Promise<ProxyChainModule> {
  proxyChainModule ??= import('proxy-chain')
  return proxyChainModule
}

function runWithSessionProxyLock<T>(
  ses: Session,
  operation: () => Promise<T>
): Promise<T> {
  const previous = proxyOperationQueues.get(ses) ?? Promise.resolve()
  const run = previous.catch(() => undefined).then(operation)
  const tail = run.then(
    () => undefined,
    () => undefined
  )

  proxyOperationQueues.set(ses, tail)
  void tail.finally(() => {
    if (proxyOperationQueues.get(ses) === tail) {
      proxyOperationQueues.delete(ses)
    }
  })

  return run
}

function nextApplyGeneration(ses: Session): number {
  const next = (latestApplyGenerationBySession.get(ses) ?? 0) + 1
  latestApplyGenerationBySession.set(ses, next)
  return next
}

function isApplyGenerationSuperseded(ses: Session, generation?: number): boolean {
  return generation !== undefined && latestApplyGenerationBySession.get(ses) !== generation
}

async function waitForPendingSessionProxyOperations(ses: Session): Promise<void> {
  const pending = proxyOperationQueues.get(ses)
  if (pending) {
    await pending
  }
}

function getProxyConfigKey(
  proxyConfig: ProxyConfig | undefined,
  bypassRules: string | undefined
): string {
  return JSON.stringify([
    proxyConfig ? 'proxy' : 'direct',
    proxyConfig?.protocol ?? '',
    proxyConfig?.host ?? '',
    proxyConfig?.port ?? '',
    proxyConfig?.username ?? '',
    proxyConfig?.password ?? '',
    bypassRules ?? ''
  ])
}

function hasProxyCredentials(proxyConfig: ProxyConfig): boolean {
  return Boolean(proxyConfig.username || proxyConfig.password)
}

function getCredentialedProxyUrl(proxyConfig: ProxyConfig): string {
  return `${proxyConfig.protocol}://${encodeURIComponent(proxyConfig.username ?? '')}:${encodeURIComponent(
    proxyConfig.password ?? ''
  )}@${formatProxyHost(proxyConfig.host)}:${proxyConfig.port}`
}

async function closeAnonymizedProxy(url: string): Promise<void> {
  try {
    const proxyChain = await loadProxyChain()
    await proxyChain.closeAnonymizedProxy(url, true)
  } catch (error) {
    console.warn('[AccountProxy] Failed to close anonymized proxy:', error)
  }
}

async function applyAccountProxyLocked(
  ses: Session,
  account: AccountProxyTarget,
  generation?: number,
  options?: ApplyAccountProxyOptions
): Promise<ProxyApplyResult> {
  const proxyConfig = accountProxyResolver(account)
  const bypassRules = options?.bypassRules
  const nextKey = getProxyConfigKey(proxyConfig, bypassRules)
  const previousState = proxyStateBySession.get(ses)
  const accountId = account?.id

  if (isApplyGenerationSuperseded(ses, generation)) {
    return { superseded: true }
  }

  if (previousState?.key === nextKey) {
    previousState.accountId = accountId
    previousState.generation += 1
    return { superseded: false }
  }

  let nextProxyRules: string | undefined
  let nextAnonymizedProxyUrl: string | undefined

  try {
    if (proxyConfig) {
      if (hasProxyCredentials(proxyConfig)) {
        const proxyChain = await loadProxyChain()
        // proxy-chain exposes an unauthenticated loopback proxy for credentialed
        // upstreams (Chromium cannot do SOCKS5 auth natively). The listener is
        // bound to 127.0.0.1 and closed with the owning session; same-machine
        // process abuse is accepted residual risk until a later per-session
        // auth gate is added.
        nextAnonymizedProxyUrl = await proxyChain.anonymizeProxy(getCredentialedProxyUrl(proxyConfig))
        if (isApplyGenerationSuperseded(ses, generation)) {
          await closeAnonymizedProxy(nextAnonymizedProxyUrl)
          return { superseded: true }
        }
        nextProxyRules = nextAnonymizedProxyUrl
      } else {
        nextProxyRules = getProxyRules(proxyConfig)
      }
      if (isApplyGenerationSuperseded(ses, generation)) {
        return { superseded: true }
      }
      await ses.setProxy({
        proxyRules: nextProxyRules,
        ...(bypassRules ? { proxyBypassRules: bypassRules } : {})
      })
    } else {
      if (isApplyGenerationSuperseded(ses, generation)) {
        return { superseded: true }
      }
      await ses.setProxy({ mode: 'direct' })
    }

    if (isApplyGenerationSuperseded(ses, generation)) {
      if (previousState?.proxyRules) {
        await ses.setProxy({
          proxyRules: previousState.proxyRules,
          ...(previousState.bypassRules ? { proxyBypassRules: previousState.bypassRules } : {})
        })
      } else {
        await ses.setProxy({ mode: 'direct' })
      }
      await ses.closeAllConnections()
      if (nextAnonymizedProxyUrl) {
        await closeAnonymizedProxy(nextAnonymizedProxyUrl)
      }
      return { superseded: true }
    }

    proxyStateBySession.set(ses, {
      key: nextKey,
      proxyRules: nextProxyRules,
      bypassRules,
      anonymizedProxyUrl: nextAnonymizedProxyUrl,
      accountId,
      refCount: previousState?.refCount ?? 0,
      generation: (previousState?.generation ?? 0) + 1
    })

    await ses.closeAllConnections()

    if (previousState?.anonymizedProxyUrl) {
      await closeAnonymizedProxy(previousState.anonymizedProxyUrl)
    }

    return { superseded: false }
  } catch (error) {
    if (nextAnonymizedProxyUrl) {
      await closeAnonymizedProxy(nextAnonymizedProxyUrl)
    }
    throw error
  }
}

export async function applyAccountProxy(
  ses: Session,
  account: AccountProxyTarget,
  options?: ApplyAccountProxyOptions
): Promise<void> {
  const generation = nextApplyGeneration(ses)
  const result = await runWithSessionProxyLock(ses, () =>
    applyAccountProxyLocked(ses, account, generation, options)
  )

  if (result.superseded) {
    await waitForPendingSessionProxyOperations(ses)
  }
}

export async function applyAccountProxyToTrackedAccountSessions(account: Account): Promise<void> {
  const sessions = Array.from(proxyStateBySession.entries())
    .filter(([, state]) => state.accountId === account.id)
    .map(([ses]) => ses)

  await Promise.all(
    sessions.map(async (ses) => {
      const generation = nextApplyGeneration(ses)
      const result = await runWithSessionProxyLock(ses, async () => {
        const state = proxyStateBySession.get(ses)
        if (!state || state.accountId !== account.id || state.refCount <= 0) {
          return { superseded: false }
        }
        return applyAccountProxyLocked(ses, account, generation)
      })

      if (result.superseded) {
        await waitForPendingSessionProxyOperations(ses)
      }
    })
  )
}

function acquireAccountProxyForSessionLocked(ses: Session): void {
  const state = proxyStateBySession.get(ses)
  if (!state) {
    throw new Error('Account proxy state was not initialized')
  }
  state.refCount += 1
}

export async function acquireAccountProxyForSession(ses: Session): Promise<void> {
  await runWithSessionProxyLock(ses, async () => {
    acquireAccountProxyForSessionLocked(ses)
  })
}

export async function withAccountProxySession<T>(
  ses: Session,
  account: AccountProxyTarget,
  fn: () => Promise<T>
): Promise<T> {
  return runWithSessionProxyLock(ses, async () => {
    await applyAccountProxyLocked(ses, account)
    acquireAccountProxyForSessionLocked(ses)
    try {
      return await fn()
    } finally {
      await releaseAccountProxyForSessionLocked(ses)
    }
  })
}

export function trackAccountProxyForWebContents(webContents: WebContents): void {
  if (webContents.isDestroyed() || trackedWebContentsSessions.has(webContents.id)) {
    return
  }

  const ses = webContents.session
  const state = proxyStateBySession.get(ses)
  if (state) {
    state.refCount += 1
  }

  trackedWebContentsSessions.set(webContents.id, ses)
  webContents.once('destroyed', () => {
    const trackedSession = trackedWebContentsSessions.get(webContents.id)
    if (!trackedSession) {
      return
    }
    trackedWebContentsSessions.delete(webContents.id)
    void releaseAccountProxyForSession(trackedSession)
  })
}

export async function releaseAccountProxyForWebContents(webContents: WebContents): Promise<void> {
  const trackedSession = trackedWebContentsSessions.get(webContents.id)
  if (!trackedSession) {
    return
  }

  trackedWebContentsSessions.delete(webContents.id)
  await releaseAccountProxyForSession(trackedSession)
}

async function releaseAccountProxyForSessionLocked(ses: Session): Promise<void> {
  const state = proxyStateBySession.get(ses)
  if (!state) {
    return
  }

  state.refCount = Math.max(0, state.refCount - 1)
  if (state.refCount > 0) {
    return
  }

  proxyStateBySession.delete(ses)
  try {
    await ses.setProxy({ mode: 'direct' })
    await ses.closeAllConnections()
  } catch (error) {
    console.warn('[AccountProxy] Failed to reset session proxy:', error)
  }

  if (state.anonymizedProxyUrl) {
    await closeAnonymizedProxy(state.anonymizedProxyUrl)
  }
}

export async function releaseAccountProxyForSession(ses: Session): Promise<void> {
  await runWithSessionProxyLock(ses, () => releaseAccountProxyForSessionLocked(ses))
}

export async function closeAllAnonymizedProxies(): Promise<void> {
  const sessions = Array.from(proxyStateBySession.keys())
  trackedWebContentsSessions.clear()

  await Promise.all(
    sessions.map((ses) => runWithSessionProxyLock(ses, async () => {
      const state = proxyStateBySession.get(ses)
      if (!state) {
        return
      }
      proxyStateBySession.delete(ses)

      try {
        await ses.setProxy({ mode: 'direct' })
        await ses.closeAllConnections()
      } catch (error) {
        console.warn('[AccountProxy] Failed to reset session during cleanup:', error)
      }

      if (state.anonymizedProxyUrl) {
        await closeAnonymizedProxy(state.anonymizedProxyUrl)
      }
    }))
  )
}
