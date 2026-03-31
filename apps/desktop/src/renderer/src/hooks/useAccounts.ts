import { useState, useEffect, useCallback } from 'react'
import type { Account, PlatformType } from '../../../shared/types'

interface UseAccountsReturn {
  accounts: Account[]
  loading: boolean
  error: Error | null
  createAccount: (platform: PlatformType) => Promise<Account>
  deleteAccount: (id: string) => Promise<void>
  updateAccount: (id: string, data: Partial<Account>) => Promise<Account>
  refreshAccounts: () => Promise<void>
}

export function useAccounts(): UseAccountsReturn {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refreshAccounts = useCallback(async () => {
    try {
      setLoading(true)
      const list = await window.api.account.list()
      setAccounts(list)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch accounts'))
    } finally {
      setLoading(false)
    }
  }, [])

  const createAccount = useCallback(async (platform: PlatformType): Promise<Account> => {
    const account = await window.api.account.create(platform)
    setAccounts((prev) => [account, ...prev])
    return account
  }, [])

  const deleteAccount = useCallback(async (id: string): Promise<void> => {
    await window.api.account.delete(id)
    setAccounts((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const updateAccount = useCallback(async (id: string, data: Partial<Account>): Promise<Account> => {
    const updated = await window.api.account.update(id, data)
    setAccounts((prev) => prev.map((a) => (a.id === id ? updated : a)))
    return updated
  }, [])

  useEffect(() => {
    refreshAccounts()
  }, [refreshAccounts])

  return {
    accounts,
    loading,
    error,
    createAccount,
    deleteAccount,
    updateAccount,
    refreshAccounts
  }
}
