import { create } from 'zustand'
import type { Account, PlatformType } from '@shared/types'

interface AccountsState {
  accounts: Account[]
  isLoading: boolean
  hasLoaded: boolean
  refresh: () => Promise<void>
  createAccount: (platform: PlatformType, options?: { proxyId?: string | null }) => Promise<Account>
  updateAccount: (id: string, data: Partial<Account>) => Promise<void>
  deleteAccount: (id: string) => Promise<void>
  openAccountBrowser: (accountId: string, url?: string) => Promise<void>
}

export const useAccountsStore = create<AccountsState>((set, get) => ({
  accounts: [],
  isLoading: false,
  hasLoaded: false,

  refresh: async () => {
    set({ isLoading: true })
    try {
      const accounts = await window.api.account.list()
      set({ accounts, hasLoaded: true })
    } catch (error) {
      console.error('Failed to load accounts:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  createAccount: async (platform, options) => {
    const account = await window.api.account.create(platform, options)
    await get().refresh()
    return account
  },

  updateAccount: async (id, data) => {
    await window.api.account.update(id, data)
    await get().refresh()
  },

  deleteAccount: async (id) => {
    await window.api.account.delete(id)
    await get().refresh()
  },

  openAccountBrowser: async (accountId, url) => {
    await window.api.browser.open(accountId, url)
  }
}))

// Keep the store in sync with background re-detections from the main process
// (e.g. login status + avatar refreshed after an account tab closes).
if (typeof window !== 'undefined' && window.api?.account?.onUpdated) {
  window.api.account.onUpdated((updated) => {
    useAccountsStore.setState((state) => ({
      accounts: state.accounts.map((account) =>
        account.id === updated.id ? updated : account
      )
    }))
  })
}
