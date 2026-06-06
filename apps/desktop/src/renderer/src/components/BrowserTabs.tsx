import { useState, useEffect, useCallback } from 'react'
import { Button } from '@heroui/react'
import {
  X,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Home,
  Layers,
  Play,
  FileEdit,
  LockKeyhole,
  Globe2,
  Loader2
} from 'lucide-react'
import type { BrowserTab, GroupTab, PublishTargetStatus } from '../../../shared/types'
import { PLATFORMS } from '../../../shared/constants'

const HOME_TAB_ID = '__home__'

const PLATFORM_ACCENTS: Record<string, string> = {
  weibo: '#e6162d',
  xiaohongshu: '#ff2442',
  twitter: '#111827',
  douyin: '#00bcd4',
  bilibili: '#00a1d6',
  zhihu: '#1677ff',
  wechat: '#07c160',
  weixinchannel: '#07c160',
  xueqiu: '#1f6feb',
  okjike: '#ffe411',
  kuaishou: '#ff4906',
  baijiahao: '#2932e1',
  toutiao: '#f04142',
  toutiaohao: '#f04142',
  v2ex: '#778087',
  douban: '#2e963d',
  juejin: '#1e80ff',
  instagram: '#e4405f',
  facebook: '#1877f2',
  linkedin: '#0a66c2',
  reddit: '#ff4500',
  threads: '#111827',
  bluesky: '#1185fe',
  substack: '#ff6719',
  youtube: '#ff0000',
  tiktok: '#00bcd4',
  medium: '#111827',
  wordpress: '#21759b',
  spotify: '#1db954'
}

const FALLBACK_ACCENTS = ['#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c', '#0891b2']

const STATUS_COLORS: Record<PublishTargetStatus, string> = {
  pending: 'bg-slate-400',
  filling: 'bg-amber-500 animate-pulse',
  ready: 'bg-emerald-500',
  success: 'bg-green-500',
  failed: 'bg-red-500',
  cancelled: 'bg-slate-500'
}

const STATUS_BORDER_COLORS: Record<PublishTargetStatus, string> = {
  pending: 'border-slate-300',
  filling: 'border-amber-400',
  ready: 'border-emerald-400',
  success: 'border-green-400',
  failed: 'border-red-400',
  cancelled: 'border-slate-400'
}

interface BrowserTabsProps {
  className?: string
}

function getPlatformAccent(platform?: string): string {
  if (!platform) return '#64748b'
  const configured = PLATFORM_ACCENTS[platform]
  if (configured) return configured

  let hash = 0
  for (const char of platform) {
    hash = (hash * 31 + char.charCodeAt(0)) % FALLBACK_ACCENTS.length
  }
  return FALLBACK_ACCENTS[hash]
}

function getTabDisplayTitle(tab: BrowserTab): string {
  if (tab.isHome) return 'MultiPost'
  if (tab.isGroup) return tab.title
  return tab.title || PLATFORMS[tab.platform]?.name || tab.platform
}

function getUrlHost(url?: string): string {
  if (!url) return ''
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.hostname.replace(/^www\./, '')
    }
    return parsed.protocol.replace(':', '')
  } catch {
    return ''
  }
}

function getAddressSecurity(url?: string): 'secure' | 'plain' | 'unknown' {
  if (!url) return 'unknown'
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'https:') return 'secure'
    if (parsed.protocol === 'http:') return 'plain'
    return 'unknown'
  } catch {
    return 'unknown'
  }
}

export function useBrowserTabs() {
  const [tabs, setTabs] = useState<BrowserTab[]>([])
  const [loading, setLoading] = useState(false)

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

  const navigateTab = useCallback(async (tabId: string, url: string) => {
    try {
      await window.api.browser.tabNavigate(tabId, url)
    } catch (error) {
      console.error('Failed to navigate tab:', error)
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
    navigateTab,
    goBack,
    goForward,
    refresh,
    loadTabs
  }
}

export function useGroupTabs(groupId: string | null) {
  const [groupTabs, setGroupTabs] = useState<GroupTab[]>([])
  const [groupStatus, setGroupStatus] = useState<string | undefined>()

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

  return {
    groupTabs,
    groupStatus,
    switchGroupTab,
    closeGroupTab,
    fillAll,
    submitAll,
    loadGroupTabs
  }
}

function TabFavicon({ tab, className = 'size-4' }: { tab: BrowserTab; className?: string }) {
  const [imgError, setImgError] = useState(false)

  if (tab.isHome) {
    return (
      <span className={`${className} inline-flex items-center justify-center rounded-md bg-blue-50 text-blue-600`}>
        <Home className="size-3.5" />
      </span>
    )
  }

  const platformInfo = PLATFORMS[tab.platform]
  const accent = getPlatformAccent(tab.platform)
  const faviconUrl = tab.faviconUrl || platformInfo?.faviconUrl

  if (faviconUrl && !imgError) {
    return (
      <span
        className={`${className} inline-flex items-center justify-center rounded-md`}
        style={{ backgroundColor: `${accent}14` }}
      >
        <img
          src={faviconUrl}
          alt=""
          className="size-3.5 rounded-sm object-contain"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
        />
      </span>
    )
  }

  const platformName = platformInfo?.name || tab.platform
  return (
    <span
      className={`${className} inline-flex items-center justify-center rounded-md text-[10px] font-semibold`}
      style={{ backgroundColor: `${accent}18`, color: accent }}
    >
      {platformName.charAt(0).toUpperCase()}
    </span>
  )
}

function TabItem({
  tab,
  onSwitch,
  onClose
}: {
  tab: BrowserTab
  onSwitch: () => void
  onClose: () => void
}) {
  const displayTitle = getTabDisplayTitle(tab)
  const host = getUrlHost(tab.url)

  return (
    <div
      className={`
        app-no-drag group flex h-8 min-w-[132px] max-w-[220px] cursor-pointer select-none items-center gap-2
        rounded-t-lg border px-2.5 text-slate-700 transition-colors
        ${
          tab.isActive
            ? 'border-slate-200 border-b-white bg-white shadow-sm'
            : 'border-transparent bg-transparent hover:bg-white/70'
        }
      `}
      onClick={onSwitch}
      title={host ? `${displayTitle} - ${host}` : displayTitle}
    >
      {tab.isGroup ? (
        <span className="inline-flex size-4 items-center justify-center rounded-md bg-amber-50 text-amber-600">
          <Layers className="size-3.5" />
        </span>
      ) : (
        <TabFavicon tab={tab} />
      )}

      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{displayTitle}</span>

      {!tab.isHome && (
        <button
          type="button"
          className="shrink-0 rounded p-0.5 text-slate-400 opacity-0 transition hover:bg-slate-200 hover:text-slate-700 group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            onClose()
          }}
          title="关闭标签页"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
}

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
  const accent = getPlatformAccent(tab.platform)

  return (
    <div
      className={`
        app-no-drag flex h-7 min-w-[108px] max-w-[168px] cursor-pointer select-none items-center gap-1.5
        rounded-md border px-2 text-slate-700 transition-colors
        ${tab.isActive ? 'bg-white shadow-sm' : 'border-transparent hover:bg-white/70'}
        ${tab.isActive ? STATUS_BORDER_COLORS[tab.status] : 'border-transparent'}
      `}
      onClick={onSwitch}
      title={`${tab.displayName} - ${platformInfo?.name || tab.platform} (${tab.status})`}
    >
      <span className={`size-2 rounded-full ${STATUS_COLORS[tab.status]}`} />

      {platformInfo?.faviconUrl ? (
        <span
          className="inline-flex size-4 items-center justify-center rounded"
          style={{ backgroundColor: `${accent}14` }}
        >
          <img
            src={platformInfo.faviconUrl}
            alt=""
            className="size-3 rounded-sm object-contain"
            referrerPolicy="no-referrer"
          />
        </span>
      ) : (
        <span
          className="inline-flex size-4 items-center justify-center rounded text-[9px] font-semibold"
          style={{ backgroundColor: `${accent}18`, color: accent }}
        >
          {(platformInfo?.name || tab.platform).charAt(0).toUpperCase()}
        </span>
      )}

      <span className="min-w-0 flex-1 truncate text-xs font-medium">{tab.displayName}</span>

      <button
        type="button"
        className="shrink-0 rounded p-0.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
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
    <div className="app-no-drag flex min-w-0 items-center gap-1">
      <div className="flex min-w-0 items-center gap-1 overflow-x-auto scrollbar-hide">
        {groupTabs.map((tab) => (
          <GroupTabItem
            key={tab.id}
            tab={tab}
            onSwitch={() => onSwitchTab(tab.id)}
            onClose={() => onCloseTab(tab.id)}
          />
        ))}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          size="sm"
          variant="flat"
          isIconOnly
          className="h-7 min-w-7 rounded-md text-slate-600"
          onPress={onFillAll}
          title="填充所有"
        >
          <FileEdit className="size-3.5" />
        </Button>
        <Button
          size="sm"
          variant="solid"
          color="primary"
          isIconOnly
          className="h-7 min-w-7 rounded-md"
          onPress={onSubmitAll}
          title="发布所有"
        >
          <Play className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}

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
  return (
    <div className="app-no-drag flex shrink-0 items-center gap-1">
      <Button
        size="sm"
        variant="light"
        isIconOnly
        className="h-7 min-w-7 rounded-md text-slate-600"
        isDisabled={!activeTab?.canGoBack}
        onPress={onGoBack}
        title="后退"
      >
        <ChevronLeft className="size-4" />
      </Button>
      <Button
        size="sm"
        variant="light"
        isIconOnly
        className="h-7 min-w-7 rounded-md text-slate-600"
        isDisabled={!activeTab?.canGoForward}
        onPress={onGoForward}
        title="前进"
      >
        <ChevronRight className="size-4" />
      </Button>
      <Button
        size="sm"
        variant="light"
        isIconOnly
        className="h-7 min-w-7 rounded-md text-slate-600"
        isDisabled={!activeTab}
        onPress={onRefresh}
        title="刷新"
      >
        <RotateCw className="size-4" />
      </Button>
    </div>
  )
}

function AddressBar({
  activeTab,
  onNavigate
}: {
  activeTab: BrowserTab | null
  onNavigate: (tabId: string, url: string) => Promise<void>
}) {
  const [address, setAddress] = useState('')
  const [isNavigating, setIsNavigating] = useState(false)

  useEffect(() => {
    setAddress(activeTab?.url || '')
  }, [activeTab?.id, activeTab?.url])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!activeTab || !address.trim()) return

    try {
      setIsNavigating(true)
      await onNavigate(activeTab.id, address.trim())
    } finally {
      setIsNavigating(false)
    }
  }

  const security = getAddressSecurity(activeTab?.url)
  const host = getUrlHost(activeTab?.url)

  return (
    <form
      className={`
        app-no-drag flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg border bg-white px-2.5 shadow-sm
        ${activeTab ? 'border-slate-200 focus-within:border-slate-400' : 'border-slate-200 opacity-70'}
      `}
      onSubmit={handleSubmit}
    >
      {isNavigating ? (
        <Loader2 className="size-4 shrink-0 animate-spin text-slate-400" />
      ) : security === 'secure' ? (
        <LockKeyhole className="size-4 shrink-0 text-emerald-600" />
      ) : (
        <Globe2 className="size-4 shrink-0 text-slate-400" />
      )}
      <input
        value={address}
        disabled={!activeTab || isNavigating}
        onChange={(event) => setAddress(event.target.value)}
        className="min-w-0 flex-1 bg-transparent text-[13px] text-slate-800 outline-none placeholder:text-slate-400"
        placeholder="输入网址"
        spellCheck={false}
      />
      {host && <span className="hidden shrink-0 text-xs text-slate-400 md:inline">{host}</span>}
    </form>
  )
}

export function BrowserTabs({ className }: BrowserTabsProps): React.ReactElement {
  const {
    tabs,
    activeTab,
    activeGroupTab,
    switchTab,
    closeTab,
    navigateTab,
    goBack,
    goForward,
    refresh
  } = useBrowserTabs()

  const activeGroupId = activeGroupTab?.groupId || null
  const { groupTabs, switchGroupTab, closeGroupTab, fillAll, submitAll } =
    useGroupTabs(activeGroupId)

  const handleCloseTab = async (tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId)
    if (tab?.isGroup && tab.groupId) {
      await window.api.publishGroup.close(tab.groupId)
    } else {
      await closeTab(tabId)
    }
  }

  return (
    <div className={`h-[72px] border-b border-slate-200 bg-[#f7f8fa] text-slate-800 ${className || ''}`}>
      <div className="app-drag flex h-9 items-end gap-1 px-2 pt-1">
        <div className="w-[78px] shrink-0" />
        <div className="flex min-w-0 flex-1 items-end gap-1 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <TabItem
              key={tab.id}
              tab={tab}
              onSwitch={() => switchTab(tab.id)}
              onClose={() => handleCloseTab(tab.id)}
            />
          ))}
        </div>
      </div>

      <div className="app-drag flex h-9 items-center gap-2 px-3 pb-1">
        <NavigationControls
          activeTab={activeTab}
          onGoBack={() => activeTab && goBack(activeTab.id)}
          onGoForward={() => activeTab && goForward(activeTab.id)}
          onRefresh={() => activeTab && refresh(activeTab.id)}
        />

        <AddressBar activeTab={activeTab} onNavigate={navigateTab} />

        {activeGroupId && groupTabs.length > 0 && (
          <div className="hidden min-w-0 max-w-[42%] shrink border-l border-slate-200 pl-2 xl:block">
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
    </div>
  )
}
