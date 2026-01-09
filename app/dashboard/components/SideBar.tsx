/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BookIcon,
  GridIcon,
  Home,
  LayoutDashboardIcon,
  ListIcon,
  PaletteIcon,
  SendIcon,
  Settings,
  FileTextIcon,
  CalendarIcon,
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
  isExternal?: boolean;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

type TranslationFunction = (key: string) => string;

// Render menu items helper component
function MenuItems({ items }: { items: MenuItem[] }) {
  return (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton asChild>
            <a
              href={item.url}
              target={item.isExternal ? '_blank' : '_self'}>
              <item.icon />
              <span>{item.title}</span>
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

// Render menu group helper component
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

// Get all menu groups
function getMenuGroups(t: TranslationFunction): MenuGroup[] {
  return [
    {
      label: t('sidebar.basic'),
      items: [
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
      ],
    },
    {
      label: t('sidebar.application'),
      items: [
        {
          title: t('sidebar.menu.publish'),
          url: '/dashboard/publish',
          icon: SendIcon,
        },
        {
          title: t('sidebar.menu.drafts'),
          url: '/dashboard/drafts',
          icon: FileTextIcon,
        },
        {
          title: t('sidebar.menu.schedule'),
          url: '/dashboard/schedule',
          icon: CalendarIcon,
        },
        {
          title: t('sidebar.menu.draw'),
          url: '/dashboard/draw',
          icon: PaletteIcon,
        },
        {
          title: t('sidebar.menu.grid'),
          url: '/dashboard/grid',
          icon: GridIcon,
        },
        // TODO: 视频转录功能暂时隐藏，待功能完善后重新启用
        // {
        //   title: t('sidebar.menu.videoTranscribe'),
        //   url: '/dashboard/video-transcribe',
        //   icon: VideoIcon,
        // },
      ],
    },
    {
      label: 'MultiGet',
      items: [
        {
          title: 'MultiGet (Beta)',
          url: 'https://docs.multipost.app/docs/user-guide/multiget',
          icon: ListIcon,
          isExternal: true,
        },
      ],
    },
  ];
}

// Get footer menu items
function getFooterItems(t: TranslationFunction): MenuItem[] {
  return [
    {
      title: t('sidebar.menu.docs'),
      url: 'https://docs.multipost.app',
      icon: BookIcon,
      isExternal: true,
    },
    {
      title: t('sidebar.menu.settings'),
      url: '/dashboard/settings',
      icon: Settings,
    },
  ];
}

export async function DashboardSidebar() {
  const { t } = await createTranslation('dashboard');
  const menuGroups = getMenuGroups(t);
  const footerItems = getFooterItems(t);

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
          {footerItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <a
                  href={item.url}
                  target={item.isExternal ? '_blank' : '_self'}>
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
