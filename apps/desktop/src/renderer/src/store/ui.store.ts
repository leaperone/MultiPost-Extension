import { create } from 'zustand'
import type { Draft } from '@shared/types'

export type NativeView =
  | 'home'
  | 'publish-dynamic'
  | 'publish-video'
  | 'publish-article'
  | 'publish-podcast'
  | 'accounts'
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
  navigate: (view: NativeView) => void
  toggleSidebar: () => void
  setDraftToEdit: (draft: Draft | null) => void
}

export const useUiStore = create<UiState>((set) => ({
  activeView: 'home',
  isSidebarCollapsed: false,
  draftToEdit: null,
  navigate: (view) => set({ activeView: view }),
  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setDraftToEdit: (draft) => set({ draftToEdit: draft })
}))
