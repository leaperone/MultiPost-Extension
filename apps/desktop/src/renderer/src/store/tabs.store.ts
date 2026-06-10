import { create } from 'zustand'
import type { BrowserTab } from '@shared/types'

export const HOME_TAB_ID = '__home__'
export const WEB_TAB_ID = '__web__'

interface TabsState {
  tabs: BrowserTab[]
  /** Subscribes to main-process tab events; returns the unsubscribe handle. */
  init: () => () => void
  switchTab: (tabId: string) => Promise<void>
  closeTab: (tabId: string) => Promise<void>
  navigateTab: (tabId: string, url: string) => Promise<void>
  goBack: (tabId: string) => Promise<void>
  goForward: (tabId: string) => Promise<void>
  refresh: (tabId: string) => Promise<void>
  openWebDashboard: (path?: string) => void
}

export const useTabsStore = create<TabsState>((set, get) => ({
  tabs: [],

  init: () => {
    void window.api.browser
      .getTabs()
      .then((tabs) => set({ tabs }))
      .catch((error) => console.error('Failed to load tabs:', error))

    return window.api.browser.onTabsChanged((tabs) => set({ tabs }))
  },

  switchTab: async (tabId) => {
    try {
      if (tabId === HOME_TAB_ID) {
        await window.api.browser.switchToHome()
      } else {
        await window.api.browser.switchTab(tabId)
      }
    } catch (error) {
      console.error('Failed to switch tab:', error)
    }
  },

  closeTab: async (tabId) => {
    const tab = get().tabs.find((t) => t.id === tabId)
    try {
      if (tab?.isGroup && tab.groupId) {
        await window.api.publishGroup.close(tab.groupId)
      } else {
        await window.api.browser.closeTab(tabId)
      }
    } catch (error) {
      console.error('Failed to close tab:', error)
    }
  },

  navigateTab: async (tabId, url) => {
    try {
      await window.api.browser.tabNavigate(tabId, url)
    } catch (error) {
      console.error('Failed to navigate tab:', error)
    }
  },

  goBack: async (tabId) => {
    try {
      await window.api.browser.tabGoBack(tabId)
    } catch (error) {
      console.error('Failed to go back:', error)
    }
  },

  goForward: async (tabId) => {
    try {
      await window.api.browser.tabGoForward(tabId)
    } catch (error) {
      console.error('Failed to go forward:', error)
    }
  },

  refresh: async (tabId) => {
    try {
      await window.api.browser.tabRefresh(tabId)
    } catch (error) {
      console.error('Failed to refresh:', error)
    }
  },

  openWebDashboard: (path) => {
    window.api.browser.openWebDashboard(path)
  }
}))

export function selectActiveTab(state: TabsState): BrowserTab | null {
  return state.tabs.find((tab) => tab.isActive) || null
}

export function selectActiveGroupTab(state: TabsState): BrowserTab | null {
  return state.tabs.find((tab) => tab.isGroup && tab.isActive) || null
}

export function selectIsHomeActive(state: TabsState): boolean {
  const activeTab = selectActiveTab(state)
  // No tabs yet (initial load) counts as home so the native UI shows instantly
  return !activeTab || activeTab.isHome
}
