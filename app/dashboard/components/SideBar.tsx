/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BookIcon,
  ChartSplineIcon,
  GridIcon,
  Home,
  ImageIcon,
  LayoutDashboardIcon,
  PaletteIcon,
  ScanEyeIcon,
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
  SidebarRail,
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
    title: t('sidebar.menu.grid'),
    url: '/dashboard/grid',
    icon: GridIcon,
  },
  {
    title: 'Analytics',
    url: '/dashboard/analytics',
    icon: ChartSplineIcon,
  },
  {
    title: 'Browse',
    url: '/dashboard/scraper',
    icon: ScanEyeIcon,
  },
  {
    title: 'Images',
    url: '/dashboard/images',
    icon: ImageIcon,
  },
  {
    title: 'Poster',
    url: '/dashboard/poster',
    icon: PaletteIcon,
  },
];

const getSidebarFooterItems = (t: TranslationFunction): MenuItem[] => [
  {
    title: t('sidebar.menu.docs'),
    url: 'https://docs.multipost.app',
    icon: BookIcon,
  },
  {
    title: t('sidebar.menu.settings'),
    url: '/dashboard/settings',
    icon: Settings,
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
      variant="sidebar"
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
      <SidebarRail />
    </Sidebar>
  );
}
