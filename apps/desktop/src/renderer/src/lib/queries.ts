import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient
} from '@tanstack/react-query'
import type {
  Account,
  PlatformType,
  ProxyProfile,
  ProxyProfileInput,
  ProxySettings,
  SyncContentType
} from '@shared/types'

type Api = Window['api']
type AccountListFilters = Parameters<Api['account']['list']>[0]
type AccountCreateOptions = Parameters<Api['account']['create']>[1]
type HistoryFilters = Parameters<Api['history']['list']>[0]
type DraftCreateInput = Parameters<Api['draft']['create']>[0]
type DraftUpdateInput = Parameters<Api['draft']['update']>[1]
type GroupCreateInput = Parameters<Api['group']['create']>[0]
type AccountUpdateInput = Parameters<Api['account']['update']>[1]

type AccountIdentity = Pick<Account, 'id' | 'username' | 'stats'>

export const queryKeys = {
  accountsRoot: ['accounts'] as const,
  accounts: (filters?: AccountListFilters) =>
    filters ? (['accounts', filters] as const) : (['accounts'] as const),
  groups: ['groups'] as const,
  draftsRoot: ['drafts'] as const,
  drafts: (contentType?: SyncContentType) =>
    contentType ? (['drafts', contentType] as const) : (['drafts'] as const),
  historyRoot: ['history'] as const,
  history: (filters?: HistoryFilters) =>
    filters ? (['history', filters] as const) : (['history'] as const),
  proxies: ['proxies'] as const,
  proxySettings: ['proxy', 'settings'] as const,
  account: (id: string) => ['account', id] as const,
  accountAnalytics: (id: string) => ['account', id, 'analytics'] as const,
  accountStatsHistory: (
    id: string,
    days: number,
    username: string,
    statsUpdatedAt: number | null
  ) => ['account', id, 'statsHistory', days, username, statsUpdatedAt] as const,
  accountPosts: (id: string) => ['account', id, 'posts'] as const,
  accountComments: (id: string, postId: string) =>
    ['account', id, 'comments', postId] as const,
  dmSessions: (id: string) => ['account', id, 'dmSessions'] as const,
  dmMessages: (id: string, sessionId: string) =>
    ['account', id, 'dmMessages', sessionId] as const
}

function accountStatsHistoryKey(account: AccountIdentity, days: number) {
  return queryKeys.accountStatsHistory(
    account.id,
    days,
    account.username,
    account.stats?.updatedAt ?? null
  )
}

export function accountAnalyticsQueryOptions(id: string, enabled = true) {
  return queryOptions({
    queryKey: queryKeys.accountAnalytics(id),
    queryFn: () => window.api.account.getAnalytics(id),
    enabled: enabled && Boolean(id)
  })
}

export function accountStatsHistoryQueryOptions(account: AccountIdentity, days: number) {
  return queryOptions({
    queryKey: accountStatsHistoryKey(account, days),
    queryFn: () => window.api.account.getStatsHistory(account.id, days),
    enabled: Boolean(account.id)
  })
}

function accountMatchesFilters(account: Account, filters: AccountListFilters | undefined): boolean {
  if (!filters) return true
  if (filters.platform !== undefined && account.platform !== filters.platform) return false
  if (filters.groupId !== undefined && account.groupId !== filters.groupId) return false
  return true
}

function patchAccountInList(
  accounts: Account[] | undefined,
  updated: Account,
  filters: AccountListFilters | undefined
): Account[] | undefined {
  if (!accounts) return accounts

  const index = accounts.findIndex((account) => account.id === updated.id)
  if (accountMatchesFilters(updated, filters)) {
    if (index === -1) return [...accounts, updated]
    const next = [...accounts]
    next[index] = updated
    return next
  }

  if (index === -1) return accounts
  return accounts.filter((account) => account.id !== updated.id)
}

export function setAccountInAccountQueries(
  queryClient: QueryClient,
  updated: Account
): void {
  const accountQueries = queryClient.getQueryCache().findAll({
    queryKey: queryKeys.accountsRoot
  })

  for (const query of accountQueries) {
    const filters = query.queryKey[1] as AccountListFilters | undefined
    queryClient.setQueryData<Account[]>(query.queryKey, (accounts) =>
      patchAccountInList(accounts, updated, filters)
    )
  }
}

function invalidateAccountLists(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.accountsRoot })
}

function invalidateGroups(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.groups })
}

function invalidateDrafts(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.draftsRoot })
}

function invalidateHistory(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.historyRoot })
}

function invalidateProxies(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.proxies })
}

function invalidateProxySettings(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.proxySettings })
}

export function useAccounts(filters?: AccountListFilters) {
  return useQuery({
    queryKey: queryKeys.accounts(filters),
    queryFn: () => window.api.account.list(filters)
  })
}

export function useGroups() {
  return useQuery({
    queryKey: queryKeys.groups,
    queryFn: () => window.api.group.list()
  })
}

export function useDrafts(contentType?: SyncContentType) {
  return useQuery({
    queryKey: queryKeys.drafts(contentType),
    queryFn: () => window.api.draft.list(contentType)
  })
}

export function useHistory(filters?: HistoryFilters) {
  return useQuery({
    queryKey: queryKeys.history(filters),
    queryFn: () => window.api.history.list(filters)
  })
}

export function useProxies() {
  return useQuery({
    queryKey: queryKeys.proxies,
    queryFn: () => window.api.proxy.list()
  })
}

export function useProxySettings() {
  return useQuery({
    queryKey: queryKeys.proxySettings,
    queryFn: () => window.api.proxy.getSettings()
  })
}

export function useAccountPosts(id: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.accountPosts(id ?? ''),
    queryFn: () => window.api.account.listPosts(id ?? ''),
    enabled: enabled && Boolean(id)
  })
}

export function useAccountComments(
  id: string | null | undefined,
  postId: string | null | undefined,
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.accountComments(id ?? '', postId ?? ''),
    queryFn: () => window.api.account.listComments(id ?? '', postId ?? ''),
    enabled: enabled && Boolean(id && postId)
  })
}

export function useDmSessions(id: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.dmSessions(id ?? ''),
    queryFn: () => window.api.account.listDmSessions(id ?? ''),
    enabled: enabled && Boolean(id)
  })
}

export function useDmMessages(
  id: string | null | undefined,
  sessionId: string | null | undefined,
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.dmMessages(id ?? '', sessionId ?? ''),
    queryFn: () => window.api.account.listDmMessages(id ?? '', sessionId ?? ''),
    enabled: enabled && Boolean(id && sessionId)
  })
}

export function useCreateAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      platform,
      options
    }: {
      platform: PlatformType
      options?: AccountCreateOptions
    }) => window.api.account.create(platform, options),
    onSuccess: () => {
      invalidateAccountLists(queryClient)
      invalidateProxies(queryClient)
    }
  })
}

export function useUpdateAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AccountUpdateInput }) =>
      window.api.account.update(id, data),
    onSuccess: (updated, variables) => {
      setAccountInAccountQueries(queryClient, updated)
      if ('proxyId' in variables.data) {
        invalidateProxies(queryClient)
      }
      if ('groupId' in variables.data) {
        invalidateGroups(queryClient)
      }
      if (
        'username' in variables.data ||
        'stats' in variables.data ||
        'displayName' in variables.data
      ) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.account(variables.id) })
      }
    }
  })
}

export function useDeleteAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => window.api.account.delete(id),
    onSuccess: (_result, id) => {
      invalidateAccountLists(queryClient)
      invalidateProxies(queryClient)
      invalidateHistory(queryClient)
      void queryClient.invalidateQueries({ queryKey: queryKeys.account(id) })
    }
  })
}

export function useSetDefaultAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, platform }: { id: string; platform: PlatformType }) =>
      window.api.account.setDefault(id, platform),
    onSuccess: () => {
      invalidateAccountLists(queryClient)
    }
  })
}

export function useRefreshAccountInfo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => window.api.account.refreshInfo(id),
    onSuccess: (updated, id) => {
      if (updated) {
        setAccountInAccountQueries(queryClient, updated)
        void queryClient.invalidateQueries({ queryKey: queryKeys.account(id) })
      }
    }
  })
}

export function useCreateGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: GroupCreateInput) => window.api.group.create(data),
    onSuccess: () => {
      invalidateGroups(queryClient)
    }
  })
}

export function useDeleteGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => window.api.group.delete(id),
    onSuccess: () => {
      invalidateGroups(queryClient)
      invalidateAccountLists(queryClient)
    }
  })
}

export function useCreateDraft() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: DraftCreateInput) => window.api.draft.create(data),
    onSuccess: () => {
      invalidateDrafts(queryClient)
    }
  })
}

export function useUpdateDraft() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DraftUpdateInput }) =>
      window.api.draft.update(id, data),
    onSuccess: () => {
      invalidateDrafts(queryClient)
    }
  })
}

export function useDeleteDraft() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => window.api.draft.delete(id),
    onSuccess: () => {
      invalidateDrafts(queryClient)
    }
  })
}

export function useDeleteHistory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => window.api.history.delete(id),
    onSuccess: () => {
      invalidateHistory(queryClient)
    }
  })
}

export function useCreateProxy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ProxyProfileInput) => window.api.proxy.create(input),
    onSuccess: (profile) => {
      queryClient.setQueryData<ProxyProfile[]>(queryKeys.proxies, (profiles) =>
        profiles ? [profile, ...profiles.filter((item) => item.id !== profile.id)] : [profile]
      )
      invalidateProxies(queryClient)
    }
  })
}

export function useUpdateProxy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ProxyProfileInput> }) =>
      window.api.proxy.update(id, input),
    onSuccess: (profile) => {
      if (profile) {
        queryClient.setQueryData<ProxyProfile[]>(queryKeys.proxies, (profiles) =>
          profiles?.map((item) => (item.id === profile.id ? profile : item)) ?? [profile]
        )
      }
      invalidateProxies(queryClient)
    }
  })
}

export function useDeleteProxy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => window.api.proxy.delete(id),
    onSuccess: (_result, id) => {
      queryClient.setQueryData<ProxyProfile[]>(queryKeys.proxies, (profiles) =>
        profiles?.filter((profile) => profile.id !== id)
      )
      invalidateProxies(queryClient)
      invalidateProxySettings(queryClient)
      invalidateAccountLists(queryClient)
    }
  })
}

export function useUpdateProxySettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (settings: Partial<ProxySettings>) => window.api.proxy.setSettings(settings),
    onSuccess: (settings) => {
      queryClient.setQueryData(queryKeys.proxySettings, settings)
      invalidateProxySettings(queryClient)
    }
  })
}

export function useReplyComment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      accountId,
      postId,
      content,
      replyCommentId
    }: {
      accountId: string
      postId: string
      content: string
      replyCommentId?: string
    }) => window.api.account.replyComment(accountId, postId, content, replyCommentId),
    onSuccess: (_created, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.accountComments(variables.accountId, variables.postId)
      })
    }
  })
}

export function useSendDm() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      accountId,
      sessionId,
      toUsername,
      text
    }: {
      accountId: string
      sessionId: string
      toUsername: string
      text: string
    }) => window.api.account.sendDm(accountId, sessionId, toUsername, text),
    onSuccess: (_sent, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.dmMessages(variables.accountId, variables.sessionId)
      })
    }
  })
}
