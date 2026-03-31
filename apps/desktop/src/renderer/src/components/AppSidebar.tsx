import {
  MessageSquare,
  Video,
  FileText,
  Settings,
  Home,
  Info,
  Terminal,
  X,
  Users,
  History,
  FileEdit
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarRail
} from '@renderer/components/ui/sidebar'
import { PLATFORMS } from '@shared/constants'
import type { PlatformType } from '@shared/types'

export type ViewType =
  | 'home'
  | 'publish-dynamic'
  | 'publish-video'
  | 'publish-article'
  | 'executor'
  | 'accounts'
  | 'account-login'
  | 'drafts'
  | 'history'
  | 'settings'
  | 'about'

// Executor account info
interface ExecutorAccountInfo {
  accountId: string
  platform: PlatformType
  displayName?: string
}

interface AppSidebarProps {
  activeView: ViewType
  onViewChange: (view: ViewType) => void
  executorAccounts?: ExecutorAccountInfo[]
  executorActiveAccountId?: string | null
  onExecutorAccountSwitch?: (accountId: string) => void
  onExecutorAccountClose?: (accountId: string) => void
}

interface MenuItem {
  id: ViewType
  title: string
  icon: React.ComponentType<{ className?: string }>
}

interface MenuGroup {
  label: string
  items: MenuItem[]
}

const menuGroups: MenuGroup[] = [
  {
    label: '基础',
    items: [{ id: 'home', title: '首页', icon: Home }]
  },
  {
    label: '立即发布',
    items: [
      { id: 'publish-dynamic', title: '动态', icon: MessageSquare },
      { id: 'publish-video', title: '视频', icon: Video },
      { id: 'publish-article', title: '文章', icon: FileText }
    ]
  },
  {
    label: '内容管理',
    items: [
      { id: 'drafts', title: '草稿箱', icon: FileEdit },
      { id: 'history', title: '发布历史', icon: History }
    ]
  },
  {
    label: '账号',
    items: [{ id: 'accounts', title: '账号管理', icon: Users }]
  }
]

const footerItems: MenuItem[] = [
  { id: 'about', title: '关于', icon: Info },
  { id: 'settings', title: '设置', icon: Settings }
]

function MenuItems({
  items,
  activeView,
  onViewChange
}: {
  items: MenuItem[]
  activeView: ViewType
  onViewChange: (view: ViewType) => void
}): React.ReactElement {
  return (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.id}>
          <SidebarMenuButton
            isActive={activeView === item.id}
            onClick={() => onViewChange(item.id)}
          >
            <item.icon className="size-4" />
            <span>{item.title}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}

function MenuGroup({
  label,
  items,
  activeView,
  onViewChange
}: MenuGroup & {
  activeView: ViewType
  onViewChange: (view: ViewType) => void
}): React.ReactElement {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <MenuItems items={items} activeView={activeView} onViewChange={onViewChange} />
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

function ExecutorGroup({
  activeView,
  onViewChange,
  accounts,
  activeAccountId,
  onAccountSwitch,
  onAccountClose
}: {
  activeView: ViewType
  onViewChange: (view: ViewType) => void
  accounts: ExecutorAccountInfo[]
  activeAccountId: string | null
  onAccountSwitch?: (accountId: string) => void
  onAccountClose?: (accountId: string) => void
}): React.ReactElement {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>执行器</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activeView === 'executor'}
              onClick={() => onViewChange('executor')}
            >
              <Terminal className="size-4" />
              <span>执行器</span>
              {accounts.length > 0 && (
                <span className="ml-auto text-xs text-muted-foreground">{accounts.length}</span>
              )}
            </SidebarMenuButton>
            {accounts.length > 0 && (
              <SidebarMenuSub>
                {accounts.map((account) => {
                  const platformInfo = PLATFORMS[account.platform]
                  // Show platform name + account display name
                  const label = account.displayName
                    ? `${platformInfo?.name || account.platform} (${account.displayName})`
                    : platformInfo?.name || account.platform
                  return (
                    <SidebarMenuSubItem key={account.accountId}>
                      <SidebarMenuSubButton
                        asChild
                        isActive={activeView === 'executor' && activeAccountId === account.accountId}
                      >
                        <button
                          className="w-full text-inherit"
                          onClick={() => {
                            onViewChange('executor')
                            onAccountSwitch?.(account.accountId)
                          }}
                        >
                          <span className="truncate text-inherit">{label}</span>
                          <span
                            className="ml-auto p-0.5 hover:bg-sidebar-border rounded opacity-0 group-hover/menu-sub-item:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation()
                              onAccountClose?.(account.accountId)
                            }}
                          >
                            <X className="size-3" />
                          </span>
                        </button>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )
                })}
              </SidebarMenuSub>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

export function AppSidebar({
  activeView,
  onViewChange,
  executorAccounts = [],
  executorActiveAccountId = null,
  onExecutorAccountSwitch,
  onExecutorAccountClose
}: AppSidebarProps): React.ReactElement {
  return (
    <Sidebar side="left" variant="sidebar" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent"
              onClick={() => onViewChange('home')}
            >
              <span className="font-semibold bg-gradient-to-br from-blue-300 to-pink-600 dark:from-blue-400 dark:to-pink-400 bg-clip-text text-transparent">
                MultiPost
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {menuGroups.map((group) => (
          <MenuGroup
            key={group.label}
            label={group.label}
            items={group.items}
            activeView={activeView}
            onViewChange={onViewChange}
          />
        ))}
        <ExecutorGroup
          activeView={activeView}
          onViewChange={onViewChange}
          accounts={executorAccounts}
          activeAccountId={executorActiveAccountId}
          onAccountSwitch={onExecutorAccountSwitch}
          onAccountClose={onExecutorAccountClose}
        />
      </SidebarContent>

      <SidebarFooter>
        <MenuItems items={footerItems} activeView={activeView} onViewChange={onViewChange} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
