import { create } from 'zustand'
import type { Draft } from '@shared/types'

export type NativeView =
  | 'home'
  | 'publish-dynamic'
  | 'publish-video'
  | 'publish-article'
  | 'publish-podcast'
  | 'accounts'
  | 'analytics'
  | 'drafts'
  | 'history'
  | 'settings'
  | 'proxy'
  | 'about'

interface UiState {
  activeView: NativeView
  isSidebarCollapsed: boolean
  /** Draft handed from the drafts page to a publish page for editing. */
  draftToEdit: Draft | null
  analyticsAccountIds: string[]
  navigate: (view: NativeView) => void
  setAnalyticsAccountIds: (accountIds: string[]) => void
  openAnalyticsForAccount: (accountId: string) => void
  toggleSidebar: () => void
  setDraftToEdit: (draft: Draft | null) => void
}

export const useUiStore = create<UiState>((set) => ({
  activeView: 'home',
  isSidebarCollapsed: false,
  draftToEdit: null,
  analyticsAccountIds: [],
  navigate: (view) => set({ activeView: view }),
  setAnalyticsAccountIds: (accountIds) => set({ analyticsAccountIds: accountIds }),
  openAnalyticsForAccount: (accountId) =>
    set({ activeView: 'analytics', analyticsAccountIds: [accountId] }),
  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setDraftToEdit: (draft) => set({ draftToEdit: draft })
}))
