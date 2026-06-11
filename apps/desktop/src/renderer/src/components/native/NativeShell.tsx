import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Button, Tooltip } from '@heroui/react'
import {
  ChevronsLeft,
  ChevronsRight,
  ClockIcon,
  FileTextIcon,
  HomeIcon,
  InfoIcon,
  MessageCircleHeartIcon,
  NotebookPenIcon,
  PodcastIcon,
  SettingsIcon,
  UsersIcon,
  VideoIcon
} from 'lucide-react'

import { useUiStore, type NativeView } from '../../store/ui.store'
import { useAccountsStore } from '../../store/accounts.store'
import { HomeView } from './HomeView'
import { PublishView } from './PublishView'
import { AccountsPage } from '../pages/AccountsPage'
import { DraftsPage } from '../pages/DraftsPage'
import { HistoryPage } from '../pages/HistoryPage'
import { SettingsPage } from '../pages/SettingsPage'
import { AboutPage } from '../pages/AboutPage'
import type { Draft } from '@shared/types'

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

function SidebarItem({
  item,
  isActive,
  isCollapsed,
  onSelect
}: {
  item: NavItem
  isActive: boolean
  isCollapsed: boolean
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
          className="absolute inset-0 rounded-lg bg-foreground/[0.06]"
          transition={{ type: 'spring', stiffness: 500, damping: 38 }}
        />
      )}
      <span className="relative z-10 shrink-0">{item.icon}</span>
      {!isCollapsed && <span className="relative z-10 truncate">{item.label}</span>}
    </button>
  )

  if (isCollapsed) {
    return (
      <Tooltip content={item.label} placement="right" delay={300} closeDelay={0}>
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
  onSelect
}: {
  title?: string
  items: NavItem[]
  activeView: NativeView
  isCollapsed: boolean
  onSelect: (view: NativeView) => void
}): React.ReactElement {
  return (
    <div className="flex flex-col gap-0.5">
      {title && !isCollapsed && (
        <p className="px-2.5 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
          {title}
        </p>
      )}
      {title && isCollapsed && <div className="my-2 border-t" />}
      {items.map((item) => (
        <SidebarItem
          key={item.view}
          item={item}
          isActive={activeView === item.view}
          isCollapsed={isCollapsed}
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

  useEffect(() => {
    void refreshAccounts()
  }, [refreshAccounts])

  return (
    <div className="flex h-full min-h-0 bg-background text-foreground">
      <motion.aside
        animate={{ width: isCollapsed ? 56 : 208 }}
        transition={{ type: 'spring', stiffness: 380, damping: 36 }}
        className="flex shrink-0 flex-col border-r bg-background"
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
            onSelect={navigate}
          />
        </div>

        <div className="flex flex-col gap-0.5 border-t p-2">
          <SidebarSection
            items={FOOTER_NAV}
            activeView={activeView}
            isCollapsed={isCollapsed}
            onSelect={navigate}
          />
          <Button
            isIconOnly
            size="sm"
            variant="light"
            className="mt-1 self-start text-muted-foreground"
            onPress={toggleSidebar}
            title={isCollapsed ? '展开侧栏' : '收起侧栏'}
          >
            {isCollapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
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
            className="mx-auto h-full max-w-5xl p-6"
          >
            <ActivePage view={activeView} />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
