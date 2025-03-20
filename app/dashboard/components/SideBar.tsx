import { AccessibilityIcon, Home, LayoutDashboardIcon, LogOut, PuzzleIcon, Settings } from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { SidebarThemeSwitcher } from '../../../components/ThemeSwitcher';
import MultiPostLogo from './Logo';
import DashboardSiderBarTrigger from './Trigger';
import { Tooltip } from '@heroui/react';
// import TwoSomeOneLogo from '../../components/Dashboard/SiderBar/TwoSomeOneLogo';
// import DashboardSiderBarTrigger from '../../components/Dashboard/SiderBar/Trigger';

// Menu items.
const items = [
  {
    title: 'Home',
    url: '/',
    icon: Home,
  },
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: LayoutDashboardIcon,
  },
];

const applicationItems = [
  {
    title: 'Publish',
    url: '/publish',
    icon: AccessibilityIcon,
  },
];

const sidebarFooterItems = [
  // {
  //   title: 'Recharge',
  //   url: '/dashboard/recharge',
  //   icon: CreditCardIcon,
  // },
  {
    title: 'Browser Extension',
    url: '/extension',
    icon: PuzzleIcon,
  },
  {
    title: 'Settings',
    url: '/dashboard/settings',
    icon: Settings,
  },
  {
    title: 'Sign Out',
    url: '/signout',
    icon: LogOut,
  }
];
export async function DashboardSidebar() {
  return (
    <Sidebar
      side="left"
      variant="floating"
      collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <MultiPostLogo />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Basic</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {applicationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarThemeSwitcher />
          </SidebarMenuItem>
          {sidebarFooterItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <a href={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          <Tooltip
            content="Ctrl + B"
            placement="right">
            <SidebarMenuItem>
              <DashboardSiderBarTrigger />
            </SidebarMenuItem>
          </Tooltip>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
