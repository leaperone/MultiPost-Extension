import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronsLeft,
  ChevronsRight,
  ClockIcon,
  FileTextIcon,
  HomeIcon,
  InfoIcon,
  Loader2,
  MessageCircleHeartIcon,
  NotebookPenIcon,
  PodcastIcon,
  SettingsIcon,
  UsersIcon,
  VideoIcon
} from 'lucide-react'

import { useUiStore, type NativeView } from '../../store/ui.store'
import { useAccountsStore } from '../../store/accounts.store'
import { usePublishStore, isTerminalTargetStatus } from '../../store/publish.store'
import { HomeView } from './HomeView'
import { PublishView } from './PublishView'
import { AccountsPage } from '../pages/AccountsPage'
import { DraftsPage } from '../pages/DraftsPage'
import { HistoryPage } from '../pages/HistoryPage'
import { SettingsPage } from '../pages/SettingsPage'
import { AboutPage } from '../pages/AboutPage'
import { Button } from '../ui/button'
import { Tooltip } from '../ui/tooltip'
import type { Draft, SyncContentType } from '@shared/types'

interface NavItem {
  view: NativeView
  label: string
  icon: React.ReactNode
}

const MAIN_NAV: NavItem[] = [
  { view: 'home', label: '首页', icon: <HomeIcon className="size-4" /> },
  { view: 'accounts', label: '账号', icon: <UsersIcon className="size-4" /> },
  { view: 'drafts', label: '草稿', icon: <NotebookPenIcon className="size-4" /> },
  { view: 'history', label: '历史', icon: <ClockIcon className="size-4" /> }
]

const PUBLISH_NAV: NavItem[] = [
  { view: 'publish-dynamic', label: '发布动态', icon: <MessageCircleHeartIcon className="size-4" /> },
  { view: 'publish-video', label: '发布视频', icon: <VideoIcon className="size-4" /> },
  { view: 'publish-article', label: '发布文章', icon: <FileTextIcon className="size-4" /> },
  { view: 'publish-podcast', label: '发布播客', icon: <PodcastIcon className="size-4" /> }
]

const FOOTER_NAV: NavItem[] = [
  { view: 'settings', label: '设置', icon: <SettingsIcon className="size-4" /> },
  { view: 'about', label: '关于', icon: <InfoIcon className="size-4" /> }
]

const CONTENT_TYPE_VIEW: Record<SyncContentType, NativeView> = {
  DYNAMIC: 'publish-dynamic',
  VIDEO: 'publish-video',
  ARTICLE: 'publish-article',
  PODCAST: 'publish-podcast'
}

function SidebarItem({
  item,
  isActive,
  isCollapsed,
  trailing,
  onSelect
}: {
  item: NavItem
  isActive: boolean
  isCollapsed: boolean
  trailing?: React.ReactNode
  onSelect: () => void
}): React.ReactElement {
  const button = (
    <button
      type="button"
      onClick={onSelect}
      className={`relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors ${
        isActive ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'
      } ${isCollapsed ? 'justify-center' : ''}`}
    >
      {isActive && (
        <motion.span
          layoutId="sidebar-active-pill"
          className="absolute inset-0 rounded-lg bg-card"
          transition={{ type: 'spring', stiffness: 500, damping: 38 }}
        />
      )}
      <span className="relative z-10 shrink-0">{item.icon}</span>
      {!isCollapsed && <span className="relative z-10 truncate">{item.label}</span>}
      {trailing &&
        (isCollapsed ? (
          <span className="absolute right-1 top-1 z-10 flex items-center">{trailing}</span>
        ) : (
          <span className="relative z-10 ml-auto flex shrink-0 items-center">{trailing}</span>
        ))}
    </button>
  )

  if (isCollapsed) {
    return (
      <Tooltip content={item.label} side="right">
        {button}
      </Tooltip>
    )
  }
  return button
}

function SidebarSection({
  title,
  items,
  activeView,
  isCollapsed,
  renderTrailing,
  onSelect
}: {
  title?: string
  items: NavItem[]
  activeView: NativeView
  isCollapsed: boolean
  renderTrailing?: (view: NativeView) => React.ReactNode
  onSelect: (view: NativeView) => void
}): React.ReactElement {
  return (
    <div className="flex flex-col gap-0.5">
      {title && !isCollapsed && (
        <p className="px-2.5 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
          {title}
        </p>
      )}
      {title && isCollapsed && <div className="my-2 border-t border-border/60" />}
      {items.map((item) => (
        <SidebarItem
          key={item.view}
          item={item}
          isActive={activeView === item.view}
          isCollapsed={isCollapsed}
          trailing={renderTrailing?.(item.view)}
          onSelect={() => onSelect(item.view)}
        />
      ))}
    </div>
  )
}

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.18, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.12, ease: 'easeIn' as const } }
}

function ActivePage({ view }: { view: NativeView }): React.ReactElement {
  const navigate = useUiStore((state) => state.navigate)
  const setDraftToEdit = useUiStore((state) => state.setDraftToEdit)
  const openAccountBrowser = useAccountsStore((state) => state.openAccountBrowser)

  const handleEditDraft = (draft: Draft): void => {
    setDraftToEdit(draft)
    const target: NativeView =
      draft.contentType === 'VIDEO'
        ? 'publish-video'
        : draft.contentType === 'ARTICLE'
          ? 'publish-article'
          : draft.contentType === 'PODCAST'
            ? 'publish-podcast'
            : 'publish-dynamic'
    navigate(target)
  }

  switch (view) {
    case 'home':
      return <HomeView />
    case 'publish-dynamic':
      return <PublishView contentType="DYNAMIC" />
    case 'publish-video':
      return <PublishView contentType="VIDEO" />
    case 'publish-article':
      return <PublishView contentType="ARTICLE" />
    case 'publish-podcast':
      return <PublishView contentType="PODCAST" />
    case 'accounts':
      return <AccountsPage onLoginAccount={(account) => void openAccountBrowser(account.id)} />
    case 'drafts':
      return <DraftsPage onEditDraft={handleEditDraft} />
    case 'history':
      return <HistoryPage />
    case 'settings':
      return <SettingsPage />
    case 'about':
      return <AboutPage />
  }
}

/**
 * Native home surface rendered by the renderer when the home tab is active.
 * Replaces the previously web-hosted /dashboard BrowserView.
 */
export function NativeShell(): React.ReactElement {
  const activeView = useUiStore((state) => state.activeView)
  const navigate = useUiStore((state) => state.navigate)
  const isCollapsed = useUiStore((state) => state.isSidebarCollapsed)
  const toggleSidebar = useUiStore((state) => state.toggleSidebar)
  const refreshAccounts = useAccountsStore((state) => state.refresh)

  // Publish run indicator: spinner while any target is still working, and a
  // red dot once a finished run contains failures the user hasn't looked at.
  const publishTargets = usePublishStore((state) => state.targets)
  const activeContentType = usePublishStore((state) => state.activeContentType)
  const activeGroupId = usePublishStore((state) => state.activeGroupId)
  const [seenFailureGroupId, setSeenFailureGroupId] = useState<string | null>(null)

  const publishView = activeContentType ? CONTENT_TYPE_VIEW[activeContentType] : null
  const hasRunningPublish = publishTargets.some((target) => !isTerminalTargetStatus(target.status))
  const hasUnresolvedFailure =
    publishTargets.length > 0 &&
    !hasRunningPublish &&
    publishTargets.some((target) => target.status === 'failed')

  useEffect(() => {
    if (hasUnresolvedFailure && publishView && activeView === publishView) {
      setSeenFailureGroupId(activeGroupId)
    }
  }, [hasUnresolvedFailure, publishView, activeView, activeGroupId])

  const showFailureDot =
    hasUnresolvedFailure && activeGroupId !== null && seenFailureGroupId !== activeGroupId

  const renderPublishTrailing = (view: NativeView): React.ReactNode => {
    if (!publishView || view !== publishView) return null
    if (hasRunningPublish) {
      return <Loader2 className="size-3 animate-spin text-muted-foreground" />
    }
    if (showFailureDot) {
      return <span className="size-1.5 rounded-full bg-destructive" />
    }
    return null
  }

  useEffect(() => {
    void refreshAccounts()
  }, [refreshAccounts])

  return (
    <div className="flex h-full min-h-0 bg-background text-foreground">
      <motion.aside
        animate={{ width: isCollapsed ? 56 : 208 }}
        transition={{ type: 'spring', stiffness: 380, damping: 36 }}
        className="flex shrink-0 flex-col bg-[hsl(var(--sidebar-background))]"
      >
        <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-2">
          <SidebarSection
            items={MAIN_NAV}
            activeView={activeView}
            isCollapsed={isCollapsed}
            onSelect={navigate}
          />
          <SidebarSection
            title="发布"
            items={PUBLISH_NAV}
            activeView={activeView}
            isCollapsed={isCollapsed}
            renderTrailing={renderPublishTrailing}
            onSelect={navigate}
          />
        </div>

        <div className="flex flex-col gap-0.5 border-t border-border/60 p-2">
          <SidebarSection
            items={FOOTER_NAV}
            activeView={activeView}
            isCollapsed={isCollapsed}
            onSelect={navigate}
          />
          <Button
            size="icon-sm"
            variant="ghost"
            className="mt-1 self-start text-muted-foreground"
            onClick={toggleSidebar}
            aria-label={isCollapsed ? '展开侧栏' : '收起侧栏'}
            title={isCollapsed ? '展开侧栏' : '收起侧栏'}
          >
            {isCollapsed ? <ChevronsRight /> : <ChevronsLeft />}
          </Button>
        </div>
      </motion.aside>

      <main className="min-w-0 flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            variants={pageVariants}
            initial="initial"
            animate="enter"
            exit="exit"
            className="h-full p-5 md:p-6 lg:p-8"
          >
            <ActivePage view={activeView} />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
