import {
  BookIcon,
  CalendarIcon,
  FileCode2Icon,
  GridIcon,
  Home,
  LayoutDashboardIcon,
  ListIcon,
  PaletteIcon,
  SendIcon,
  Settings,
  VideoIcon,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { Tooltip } from '@heroui/react';
import { Link, useLocation } from '@tanstack/react-router';

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
  SidebarRail,
} from '@/components/ui/sidebar';
import { useTranslation } from '../../../i18n/client';
import MultiPostLogo from './Logo';
import SidebarFeedbackTrigger from './SidebarFeedbackTrigger';
import DashboardSidebarTrigger from './SidebarTrigger';
import { SidebarThemeSwitcher } from './SidebarThemeSwitcher';

interface MenuItem {
  title: string;
  url: string;
  icon: ComponentType;
  isExternal?: boolean;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

type TranslationFunction = (key: string) => string;

function getMenuGroups(t: TranslationFunction): MenuGroup[] {
  return [
    {
      label: t('sidebar.basic'),
      items: [
        { title: t('sidebar.menu.home'), url: '/', icon: Home },
        { title: t('sidebar.menu.dashboard'), url: '/dashboard', icon: LayoutDashboardIcon },
      ],
    },
    {
      label: t('sidebar.application'),
      items: [
        { title: t('sidebar.menu.publish'), url: '/dashboard/publish', icon: SendIcon },
        { title: t('sidebar.menu.schedule'), url: '/dashboard/schedule', icon: CalendarIcon },
        { title: t('sidebar.menu.draw'), url: '/dashboard/draw', icon: PaletteIcon },
        { title: t('sidebar.menu.markdown'), url: '/dashboard/md', icon: FileCode2Icon },
        { title: t('sidebar.menu.grid'), url: '/dashboard/grid', icon: GridIcon },
        {
          title: t('sidebar.menu.videoTranscribe'),
          url: '/dashboard/video-transcribe',
          icon: VideoIcon,
        },
      ],
    },
    {
      label: 'MultiGet',
      items: [
        {
          title: 'MultiGet (Beta)',
          url: '/docs/user-guide/multiget',
          icon: ListIcon,
          isExternal: true,
        },
      ],
    },
  ];
}

function getFooterItems(t: TranslationFunction): MenuItem[] {
  return [
    { title: t('sidebar.menu.docs'), url: '/docs', icon: BookIcon, isExternal: true },
    { title: t('sidebar.menu.settings'), url: '/dashboard/settings', icon: Settings },
  ];
}

function MenuItems({ items }: { items: MenuItem[] }) {
  const pathname = useLocation({
    select: (location) => location.pathname,
  });

  return (
    <SidebarMenu>
      {items.map((item) => {
        const isActive =
          item.url === '/dashboard'
            ? pathname === item.url
            : item.url !== '/' && pathname.startsWith(item.url);

        return (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
              asChild
              isActive={isActive}>
              {item.isExternal ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer">
                  <item.icon />
                  <span>{item.title}</span>
                </a>
              ) : (
                <Link to={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

function MenuGroup({ label, items }: MenuGroup) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <MenuItems items={items} />
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function DashboardSidebar() {
  const { t } = useTranslation('dashboard');
  const { t: tFeedback } = useTranslation('feedback');
  const pathname = useLocation({
    select: (location) => location.pathname,
  });
  const menuGroups = getMenuGroups(t);
  const footerItems = getFooterItems(t);

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
        {menuGroups.map((group) => (
          <MenuGroup
            key={group.label}
            label={group.label}
            items={group.items}
          />
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarThemeSwitcher />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarFeedbackTrigger label={tFeedback('entry.sidebar')} />
          </SidebarMenuItem>
          {footerItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(item.url)}>
                {item.isExternal ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer">
                    <item.icon />
                    <span>{item.title}</span>
                  </a>
                ) : (
                  <Link to={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          <Tooltip
            content="Ctrl + B"
            placement="right">
            <SidebarMenuItem>
              <DashboardSidebarTrigger />
            </SidebarMenuItem>
          </Tooltip>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
