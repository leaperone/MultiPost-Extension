import { useState, useEffect, useCallback } from 'react'
import { Button } from '@heroui/react'
import { X, ChevronLeft, ChevronRight, RotateCw, Home, Layers, Play, FileEdit } from 'lucide-react'
import type { BrowserTab, GroupTab, PublishTargetStatus } from '../../../shared/types'
import { PLATFORMS } from '../../../shared/constants'

// Home tab ID constant (must match browserViewManager.ts)
const HOME_TAB_ID = '__home__'

// Status colors for group tabs - more vibrant colors
const STATUS_COLORS: Record<PublishTargetStatus, string> = {
  pending: 'bg-gray-400',
  filling: 'bg-amber-500 animate-pulse',
  ready: 'bg-emerald-500',
  success: 'bg-green-500',
  failed: 'bg-red-500',
  cancelled: 'bg-gray-500'
}

// Status border colors for group tabs
const STATUS_BORDER_COLORS: Record<PublishTargetStatus, string> = {
  pending: 'border-gray-300',
  filling: 'border-amber-400',
  ready: 'border-emerald-400',
  success: 'border-green-400',
  failed: 'border-red-400',
  cancelled: 'border-gray-400'
}

interface BrowserTabsProps {
  className?: string
}

// Custom hook to manage browser tabs state
export function useBrowserTabs() {
  const [tabs, setTabs] = useState<BrowserTab[]>([])
  const [loading, setLoading] = useState(false)

  // Load initial tabs
  const loadTabs = useCallback(async () => {
    try {
      setLoading(true)
      const tabList = await window.api.browser.getTabs()
      setTabs(tabList)
    } catch (error) {
      console.error('Failed to load tabs:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Subscribe to tabs changed events
  useEffect(() => {
    loadTabs()

    const unsubscribe = window.api.browser.onTabsChanged((updatedTabs) => {
      setTabs(updatedTabs)
    })

    return () => {
      unsubscribe()
    }
  }, [loadTabs])

  const switchTab = useCallback(async (accountId: string) => {
    try {
      if (accountId === HOME_TAB_ID) {
        await window.api.browser.switchToHome()
      } else {
        await window.api.browser.switchTab(accountId)
      }
    } catch (error) {
      console.error('Failed to switch tab:', error)
    }
  }, [])

  const closeTab = useCallback(async (accountId: string) => {
    try {
      const success = await window.api.browser.closeTab(accountId)
      if (!success) {
        console.log('Cannot close home tab')
      }
    } catch (error) {
      console.error('Failed to close tab:', error)
    }
  }, [])

  const goBack = useCallback(async (accountId: string) => {
    try {
      await window.api.browser.tabGoBack(accountId)
    } catch (error) {
      console.error('Failed to go back:', error)
    }
  }, [])

  const goForward = useCallback(async (accountId: string) => {
    try {
      await window.api.browser.tabGoForward(accountId)
    } catch (error) {
      console.error('Failed to go forward:', error)
    }
  }, [])

  const refresh = useCallback(async (accountId: string) => {
    try {
      await window.api.browser.tabRefresh(accountId)
    } catch (error) {
      console.error('Failed to refresh:', error)
    }
  }, [])

  const activeTab = tabs.find((tab) => tab.isActive) || null
  const activeGroupTab = tabs.find((tab) => tab.isGroup && tab.isActive) || null

  return {
    tabs,
    activeTab,
    activeGroupTab,
    loading,
    switchTab,
    closeTab,
    goBack,
    goForward,
    refresh,
    loadTabs
  }
}

// Custom hook to manage group tabs state
export function useGroupTabs(groupId: string | null) {
  const [groupTabs, setGroupTabs] = useState<GroupTab[]>([])
  const [groupStatus, setGroupStatus] = useState<string | undefined>()

  // Load group tabs
  const loadGroupTabs = useCallback(async () => {
    if (!groupId) {
      setGroupTabs([])
      return
    }
    try {
      const tabs = await window.api.publishGroup.getTabs(groupId)
      setGroupTabs(tabs)
    } catch (error) {
      console.error('Failed to load group tabs:', error)
    }
  }, [groupId])

  // Subscribe to group tabs changed events
  useEffect(() => {
    loadGroupTabs()

    const unsubscribe = window.api.publishGroup.onGroupTabsChanged((data) => {
      if (data.groupId === groupId) {
        setGroupTabs(data.tabs)
        setGroupStatus(data.status)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [groupId, loadGroupTabs])

  const switchGroupTab = useCallback(
    async (accountId: string) => {
      if (!groupId) return
      try {
        await window.api.publishGroup.switchTab(groupId, accountId)
      } catch (error) {
        console.error('Failed to switch group tab:', error)
      }
    },
    [groupId]
  )

  const closeGroupTab = useCallback(
    async (accountId: string) => {
      if (!groupId) return
      try {
        await window.api.publishGroup.closeTab(groupId, accountId)
      } catch (error) {
        console.error('Failed to close group tab:', error)
      }
    },
    [groupId]
  )

  const fillAll = useCallback(async () => {
    if (!groupId) return
    try {
      await window.api.publishGroup.fill(groupId)
    } catch (error) {
      console.error('Failed to fill group content:', error)
    }
  }, [groupId])

  const submitAll = useCallback(async () => {
    if (!groupId) return
    try {
      await window.api.publishGroup.submitAll(groupId)
    } catch (error) {
      console.error('Failed to submit group:', error)
    }
  }, [groupId])

  const closeGroup = useCallback(async () => {
    if (!groupId) return
    try {
      await window.api.publishGroup.close(groupId)
    } catch (error) {
      console.error('Failed to close group:', error)
    }
  }, [groupId])

  return {
    groupTabs,
    groupStatus,
    switchGroupTab,
    closeGroupTab,
    fillAll,
    submitAll,
    closeGroup,
    loadGroupTabs
  }
}

// Tab favicon component
function TabFavicon({ tab }: { tab: BrowserTab }) {
  const [imgError, setImgError] = useState(false)

  // Home tab shows home icon
  if (tab.isHome) {
    return <Home className="size-4 text-muted-foreground" />
  }

  // Get favicon URL from platform config or tab
  const faviconUrl = tab.faviconUrl || PLATFORMS[tab.platform]?.faviconUrl

  if (!faviconUrl || imgError) {
    // Fallback: show first letter of platform name
    const platformName = PLATFORMS[tab.platform]?.name || tab.platform
    return (
      <div className="size-4 rounded bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
        {platformName.charAt(0).toUpperCase()}
      </div>
    )
  }

  return (
    <img
      src={faviconUrl}
      alt=""
      className="size-4 rounded"
      onError={() => setImgError(true)}
    />
  )
}

// Single tab component
function TabItem({
  tab,
  onSwitch,
  onClose
}: {
  tab: BrowserTab
  onSwitch: () => void
  onClose: () => void
}) {
  const platformInfo = PLATFORMS[tab.platform]

  // Get display title - for group tabs show the group name
  const displayTitle = tab.isHome
    ? '首页'
    : tab.isGroup
      ? tab.title
      : (tab.title || platformInfo?.name || tab.platform)

  return (
    <div
      className={`
        flex items-center gap-2 px-3 py-1 rounded-md cursor-pointer select-none
        transition-colors whitespace-nowrap group min-w-0 max-w-[200px]
        ${tab.isActive ? 'bg-muted' : 'hover:bg-muted/50'}
      `}
      onClick={onSwitch}
      title={displayTitle}
    >
      {/* Favicon - show Layers icon for group tabs */}
      {tab.isGroup ? (
        <Layers className="size-4 text-muted-foreground" />
      ) : (
        <TabFavicon tab={tab} />
      )}

      {/* Title */}
      <span className="text-sm truncate flex-1">{displayTitle}</span>

      {/* Close button (not shown for home tab) */}
      {!tab.isHome && (
        <button
          type="button"
          className="ml-1 opacity-60 hover:opacity-100 hover:bg-muted-foreground/20 rounded p-0.5 transition-opacity shrink-0"
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            onClose()
          }}
          title="关闭标签页"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  )
}

// Group tab item component - compact inline style with status colors
function GroupTabItem({
  tab,
  onSwitch,
  onClose
}: {
  tab: GroupTab
  onSwitch: () => void
  onClose: () => void
}) {
  const platformInfo = PLATFORMS[tab.platform]

  return (
    <div
      className={`
        flex items-center gap-1.5 px-2 py-0.5 rounded-md cursor-pointer select-none
        transition-all whitespace-nowrap min-w-0 max-w-[160px] border
        ${tab.isActive ? 'bg-muted shadow-sm' : 'hover:bg-muted/50 border-transparent'}
        ${tab.isActive ? STATUS_BORDER_COLORS[tab.status] : 'border-transparent'}
      `}
      onClick={onSwitch}
      title={`${tab.displayName} - ${platformInfo?.name || tab.platform} (${tab.status})`}
    >
      {/* Status indicator */}
      <div className={`size-2 rounded-full shrink-0 ${STATUS_COLORS[tab.status]}`} />

      {/* Platform favicon */}
      {platformInfo?.faviconUrl ? (
        <img src={platformInfo.faviconUrl} alt="" className="size-3.5 rounded" />
      ) : (
        <div className="size-3.5 rounded bg-muted flex items-center justify-center text-[9px] font-medium text-muted-foreground">
          {(platformInfo?.name || tab.platform).charAt(0).toUpperCase()}
        </div>
      )}

      {/* Display name */}
      <span className="text-xs font-medium truncate flex-1">{tab.displayName}</span>

      {/* Close button */}
      <button
        type="button"
        className="opacity-60 hover:opacity-100 hover:bg-muted-foreground/20 rounded p-0.5 transition-opacity shrink-0"
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          onClose()
        }}
        title="关闭"
      >
        <X className="size-3" />
      </button>
    </div>
  )
}

// Group tab bar component (inline in single row - when group is active)
function GroupTabBar({
  groupTabs,
  onSwitchTab,
  onCloseTab,
  onFillAll,
  onSubmitAll
}: {
  groupTabs: GroupTab[]
  onSwitchTab: (accountId: string) => void
  onCloseTab: (accountId: string) => void
  onFillAll: () => void
  onSubmitAll: () => void
}) {
  return (
    <div className="flex items-center gap-1">
      {/* Group tabs */}
      <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
        {groupTabs.map((tab) => (
          <GroupTabItem
            key={tab.id}
            tab={tab}
            onSwitch={() => onSwitchTab(tab.id)}
            onClose={() => onCloseTab(tab.id)}
          />
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 shrink-0 ml-1">
        <Button
          size="sm"
          variant="flat"
          className="h-6 px-2 text-xs"
          onPress={onFillAll}
          startContent={<FileEdit className="size-3" />}
        >
          填充
        </Button>
        <Button
          size="sm"
          variant="solid"
          color="primary"
          className="h-6 px-2 text-xs"
          onPress={onSubmitAll}
          startContent={<Play className="size-3" />}
        >
          发布
        </Button>
      </div>
    </div>
  )
}

// Navigation controls for active tab
function NavigationControls({
  activeTab,
  onGoBack,
  onGoForward,
  onRefresh
}: {
  activeTab: BrowserTab | null
  onGoBack: () => void
  onGoForward: () => void
  onRefresh: () => void
}) {
  if (!activeTab) return null

  return (
    <div className="flex items-center gap-1 mr-2 shrink-0">
      <Button
        size="sm"
        variant="light"
        isIconOnly
        className="min-w-7 w-7 h-7"
        isDisabled={!activeTab.canGoBack}
        onPress={onGoBack}
        title="后退"
      >
        <ChevronLeft className="size-4" />
      </Button>
      <Button
        size="sm"
        variant="light"
        isIconOnly
        className="min-w-7 w-7 h-7"
        isDisabled={!activeTab.canGoForward}
        onPress={onGoForward}
        title="前进"
      >
        <ChevronRight className="size-4" />
      </Button>
      <Button
        size="sm"
        variant="light"
        isIconOnly
        className="min-w-7 w-7 h-7"
        onPress={onRefresh}
        title="刷新"
      >
        <RotateCw className="size-4" />
      </Button>
    </div>
  )
}

export function BrowserTabs({ className }: BrowserTabsProps): React.ReactElement {
  const { tabs, activeTab, activeGroupTab, switchTab, closeTab, goBack, goForward, refresh } =
    useBrowserTabs()

  // Get active group ID from the active group tab
  const activeGroupId = activeGroupTab?.groupId || null

  // Use group tabs hook
  const { groupTabs, switchGroupTab, closeGroupTab, fillAll, submitAll } =
    useGroupTabs(activeGroupId)

  const handleGoBack = () => {
    if (activeTab) {
      goBack(activeTab.id)
    }
  }

  const handleGoForward = () => {
    if (activeTab) {
      goForward(activeTab.id)
    }
  }

  const handleRefresh = () => {
    if (activeTab) {
      refresh(activeTab.id)
    }
  }

  const handleCloseTab = async (tabId: string) => {
    // Check if this is a group tab
    const tab = tabs.find((t) => t.id === tabId)
    if (tab?.isGroup && tab.groupId) {
      // Close the entire group
      await window.api.publishGroup.close(tab.groupId)
    } else {
      await closeTab(tabId)
    }
  }

  return (
    <div className={`bg-background h-10 border-b flex items-center gap-1 px-2 ${className || ''}`}>
      {/* Navigation controls */}
      <NavigationControls
        activeTab={activeTab}
        onGoBack={handleGoBack}
        onGoForward={handleGoForward}
        onRefresh={handleRefresh}
      />

      {/* Tab list */}
      <div className="flex items-center gap-0.5 flex-1 overflow-x-auto scrollbar-hide min-w-0">
        {tabs.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            onSwitch={() => switchTab(tab.id)}
            onClose={() => handleCloseTab(tab.id)}
          />
        ))}
      </div>

      {/* Right section: Group tabs (when group is active) */}
      {activeGroupId && groupTabs.length > 0 && (
        <div className="shrink-0 border-l ml-1 pl-1">
          <GroupTabBar
            groupTabs={groupTabs}
            onSwitchTab={switchGroupTab}
            onCloseTab={closeGroupTab}
            onFillAll={fillAll}
            onSubmitAll={submitAll}
          />
        </div>
      )}
    </div>
  )
}
