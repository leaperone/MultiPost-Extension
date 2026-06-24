import type { QueryClient } from '@tanstack/react-query'
import type { Account, AccountStats } from '@shared/types'
import { queryKeys, setAccountInAccountQueries } from './queries'

let installed = false
let historyInvalidationTimer: ReturnType<typeof setTimeout> | null = null

function statsFingerprint(stats: AccountStats | undefined): string {
  if (!stats) return ''
  return [
    stats.fans ?? '',
    stats.following ?? '',
    stats.likes ?? '',
    stats.works ?? '',
    stats.views ?? '',
    stats.updatedAt ?? ''
  ].join(':')
}

function accountIdentityFingerprint(account: Account): string {
  return `${account.username}:${statsFingerprint(account.stats)}`
}

function scheduleHistoryInvalidation(queryClient: QueryClient): void {
  if (historyInvalidationTimer) {
    clearTimeout(historyInvalidationTimer)
  }

  historyInvalidationTimer = setTimeout(() => {
    historyInvalidationTimer = null
    void queryClient.invalidateQueries({ queryKey: queryKeys.historyRoot })
  }, 250)
}

export function installQueryEventBridges(queryClient: QueryClient): void {
  if (installed) return
  installed = true

  window.api.account.onUpdated((updated) => {
    const previous = queryClient
      .getQueriesData<Account[]>({ queryKey: queryKeys.accountsRoot })
      .flatMap(([, accounts]) => accounts ?? [])
      .find((account) => account.id === updated.id)
    const identityChanged =
      previous !== undefined &&
      accountIdentityFingerprint(previous) !== accountIdentityFingerprint(updated)

    setAccountInAccountQueries(queryClient, updated)

    if (identityChanged) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.account(updated.id) })
    }
  })

  window.api.keepAlive.onAccountLoggedOut(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.accountsRoot })
  })

  window.api.publish.onComplete(() => {
    scheduleHistoryInvalidation(queryClient)
  })

  window.api.publishGroup.onGroupSummary(() => {
    scheduleHistoryInvalidation(queryClient)
  })
}
