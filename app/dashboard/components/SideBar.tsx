/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ChartSplineIcon,
  CreditCardIcon,
  GridIcon,
  Home,
  KeyIcon,
  LayoutDashboardIcon,
  LogOut,
  PuzzleIcon,
  SendIcon,
  Settings,
} from 'lucide-react';

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
import { createTranslation } from '@/i18n/server';

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType;
}

type TranslationFunction = (key: string) => string;

// Menu items.
const getItems = (t: TranslationFunction): MenuItem[] => [
  {
    title: t('sidebar.menu.home'),
    url: '/',
    icon: Home,
  },
  {
    title: t('sidebar.menu.dashboard'),
    url: '/dashboard',
    icon: LayoutDashboardIcon,
  },
];

const getApplicationItems = (t: TranslationFunction): MenuItem[] => [
  {
    title: t('sidebar.menu.publish'),
    url: '/dashboard/publish',
    icon: SendIcon,
  },
  {
    title: 'Grid',
    url: '/dashboard/grid',
    icon: GridIcon,
  },
  {
    title: 'WebTrace',
    url: '/dashboard/analytics',
    icon: ChartSplineIcon,
  },
  {
    title: 'Scraper',
    url: '/dashboard/scraper',
    icon: ChartSplineIcon,
  },
];

const getSidebarFooterItems = (t: TranslationFunction): MenuItem[] => [
  // {
  //   title: 'Recharge',
  //   url: '/dashboard/recharge',
  //   icon: CreditCardIcon,
  // },
  {
    title: t('sidebar.menu.apiKeys'),
    url: '/dashboard/api-keys',
    icon: KeyIcon,
  },
  {
    title: t('sidebar.menu.extension'),
    url: '/extension',
    icon: PuzzleIcon,
  },
  {
    title: t('sidebar.menu.recharge'),
    url: '/dashboard/recharge',
    icon: CreditCardIcon,
  },
  {
    title: t('sidebar.menu.settings'),
    url: '/dashboard/settings',
    icon: Settings,
  },
  {
    title: t('sidebar.menu.signout'),
    url: '/signout',
    icon: LogOut,
  },
];

export async function DashboardSidebar() {
  const { t } = await createTranslation('dashboard');
  const items = getItems(t);
  const applicationItems = getApplicationItems(t);
  const sidebarFooterItems = getSidebarFooterItems(t);

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
          <SidebarGroupLabel>{t('sidebar.basic')}</SidebarGroupLabel>
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
          <SidebarGroupLabel>{t('sidebar.application')}</SidebarGroupLabel>
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
