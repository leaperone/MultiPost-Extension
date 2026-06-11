import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTabsStore } from '../store/tabs.store'
import { Button } from './ui/button'
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
  Loader2,
  Circle,
  CheckCircle,
  XCircle,
  type LucideIcon
} from 'lucide-react'
import type { BrowserTab, GroupTab, PublishTargetStatus } from '../../../shared/types'
import { PLATFORMS } from '../../../shared/constants'

// 状态靠图标 + 文字表达,不靠颜色块(The One Red Rule:仅失败用警示红)
const STATUS_META: Record<PublishTargetStatus, { icon: LucideIcon; className: string; label: string }> = {
  pending: { icon: Circle, className: 'text-muted-foreground', label: '等待' },
  filling: { icon: Loader2, className: 'animate-spin text-muted-foreground', label: '填充中' },
  ready: { icon: CheckCircle, className: 'text-foreground', label: '就绪' },
  success: { icon: CheckCircle, className: 'text-foreground', label: '已发布' },
  failed: { icon: XCircle, className: 'text-destructive', label: '失败' },
  cancelled: { icon: Circle, className: 'text-muted-foreground', label: '已取消' }
}

interface BrowserTabsProps {
  className?: string
}

function getTabDisplayTitle(tab: BrowserTab): string {
  if (tab.isHome) return 'MultiPost'
  if (tab.isWeb) return tab.title || 'Web 工作台'
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
  // Tab state lives in the shared zustand store (single IPC subscription,
  // initialized by App); this hook only derives view-friendly values.
  const tabs = useTabsStore((state) => state.tabs)
  const { switchTab, closeTab, navigateTab, goBack, goForward, refresh } = useTabsStore.getState()

  const activeTab = tabs.find((tab) => tab.isActive) || null
  const activeGroupTab = tabs.find((tab) => tab.isGroup && tab.isActive) || null

  return {
    tabs,
    activeTab,
    activeGroupTab,
    switchTab,
    closeTab,
    navigateTab,
    goBack,
    goForward,
    refresh
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
      <span className={`${className} inline-flex items-center justify-center rounded-md bg-foreground/[0.06] text-foreground`}>
        <Home className="size-3.5" />
      </span>
    )
  }

  if (tab.isWeb) {
    return (
      <span className={`${className} inline-flex items-center justify-center rounded-md bg-foreground/[0.06] text-foreground`}>
        <Globe2 className="size-3.5" />
      </span>
    )
  }

  const platformInfo = PLATFORMS[tab.platform]
  const faviconUrl = tab.faviconUrl || platformInfo?.faviconUrl

  if (faviconUrl && !imgError) {
    return (
      <span className={`${className} inline-flex items-center justify-center rounded-md bg-muted`}>
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
      className={`${className} inline-flex items-center justify-center rounded-md bg-muted text-[10px] font-semibold text-foreground`}
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
    <motion.div
      layout
      initial={{ opacity: 0, y: 6, width: 0 }}
      animate={{ opacity: 1, y: 0, width: 'auto' }}
      exit={{ opacity: 0, scale: 0.92, width: 0, transition: { duration: 0.12 } }}
      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
      className={`
        app-no-drag group flex h-8 min-w-[132px] max-w-[220px] cursor-pointer select-none items-center gap-2
        rounded-lg px-2.5 text-foreground/80 transition-colors
        ${
          tab.isActive
            ? 'bg-card text-foreground'
            : 'bg-transparent hover:bg-foreground/[0.04]'
        }
      `}
      onClick={onSwitch}
      onAuxClick={(e) => {
        // Middle click closes the tab, matching browser conventions
        if (e.button === 1 && !tab.isHome) {
          e.preventDefault()
          onClose()
        }
      }}
      title={host ? `${displayTitle} - ${host}` : displayTitle}
    >
      {tab.isGroup ? (
        <span className="inline-flex size-4 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Layers className="size-3.5" />
        </span>
      ) : (
        <TabFavicon tab={tab} />
      )}

      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{displayTitle}</span>

      {!tab.isHome && (
        <button
          type="button"
          className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition hover:bg-foreground/[0.08] hover:text-foreground group-hover:opacity-100"
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
    </motion.div>
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
  const status = STATUS_META[tab.status]
  const StatusIcon = status.icon

  return (
    <div
      className={`
        app-no-drag flex h-7 min-w-[108px] max-w-[168px] cursor-pointer select-none items-center gap-1.5
        rounded-lg px-2 text-foreground/80 transition-colors
        ${tab.isActive ? 'bg-card text-foreground' : 'hover:bg-foreground/[0.04]'}
      `}
      onClick={onSwitch}
      title={`${tab.displayName} - ${platformInfo?.name || tab.platform}（${status.label}）`}
    >
      <StatusIcon className={`size-3 shrink-0 ${status.className}`} aria-label={status.label} />

      {platformInfo?.faviconUrl ? (
        <span className="inline-flex size-4 items-center justify-center rounded bg-muted">
          <img
            src={platformInfo.faviconUrl}
            alt=""
            className="size-3 rounded-sm object-contain"
            referrerPolicy="no-referrer"
          />
        </span>
      ) : (
        <span className="inline-flex size-4 items-center justify-center rounded bg-muted text-[9px] font-semibold text-foreground">
          {(platformInfo?.name || tab.platform).charAt(0).toUpperCase()}
        </span>
      )}

      <span className="min-w-0 flex-1 truncate text-xs font-medium">{tab.displayName}</span>

      <button
        type="button"
        className="shrink-0 rounded p-0.5 text-muted-foreground transition hover:bg-foreground/[0.08] hover:text-foreground"
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
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto scrollbar-hide">
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
        <Button size="sm" variant="secondary" className="h-7 px-2" onClick={onFillAll}>
          <FileEdit />
          填充所有
        </Button>
        <Button size="sm" variant="default" className="h-7 px-2" onClick={onSubmitAll}>
          <Play />
          发布所有
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
        size="icon-sm"
        variant="ghost"
        className="text-muted-foreground"
        disabled={!activeTab?.canGoBack}
        onClick={onGoBack}
        aria-label="后退"
        title="后退"
      >
        <ChevronLeft />
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        className="text-muted-foreground"
        disabled={!activeTab?.canGoForward}
        onClick={onGoForward}
        aria-label="前进"
        title="前进"
      >
        <ChevronRight />
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        className="text-muted-foreground"
        disabled={!activeTab}
        onClick={onRefresh}
        aria-label="刷新"
        title="刷新"
      >
        <RotateCw />
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
        app-no-drag flex h-8 min-w-[120px] flex-1 items-center gap-2 rounded-lg bg-foreground/[0.05] px-2.5 transition-colors
        ${activeTab ? 'focus-within:bg-foreground/[0.08]' : 'opacity-70'}
      `}
      onSubmit={handleSubmit}
    >
      {isNavigating ? (
        <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
      ) : security === 'secure' ? (
        <LockKeyhole className="size-4 shrink-0 text-muted-foreground" />
      ) : (
        <Globe2 className="size-4 shrink-0 text-muted-foreground" />
      )}
      <input
        value={address}
        disabled={!activeTab || isNavigating}
        onChange={(event) => setAddress(event.target.value)}
        className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
        placeholder="输入网址"
        spellCheck={false}
      />
      {host && <span className="hidden shrink-0 text-xs text-muted-foreground md:inline">{host}</span>}
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

  // Group-tab handling lives inside the store's closeTab
  const handleCloseTab = closeTab

  const isNativeHomeActive = !activeTab || activeTab.isHome

  return (
    <div className={`h-[72px] bg-background text-foreground ${className || ''}`}>
      <div className="app-drag flex h-9 items-center gap-1 px-2 pt-1">
        <div className="w-[78px] shrink-0" />
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto scrollbar-hide">
          <AnimatePresence initial={false}>
            {tabs.map((tab) => (
              <TabItem
                key={tab.id}
                tab={tab}
                onSwitch={() => switchTab(tab.id)}
                onClose={() => handleCloseTab(tab.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div className="app-drag flex h-9 items-center gap-2 px-3 pb-1">
        {isNativeHomeActive ? (
          // Native home has no navigable web contents; keep the row as a
          // draggable title strip instead of dead navigation controls.
          <div className="flex h-8 min-w-0 flex-1 items-center px-1.5 text-xs text-muted-foreground">
            原生工作台 · 在下方选择功能，或打开账号标签页
          </div>
        ) : (
          <>
            <NavigationControls
              activeTab={activeTab}
              onGoBack={() => activeTab && goBack(activeTab.id)}
              onGoForward={() => activeTab && goForward(activeTab.id)}
              onRefresh={() => activeTab && refresh(activeTab.id)}
            />

            <AddressBar activeTab={activeTab} onNavigate={navigateTab} />
          </>
        )}

        {activeGroupId && groupTabs.length > 0 && (
          // 始终渲染(窄窗口手动发布不能没有入口);空间不足时组标签区横向滚动,操作按钮保持可见
          <div className="min-w-0 max-w-[55%] shrink border-l border-border/60 pl-2">
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
