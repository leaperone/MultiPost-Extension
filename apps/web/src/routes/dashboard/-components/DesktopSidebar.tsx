import {
  Calendar,
  FileEdit,
  FileText,
  Grid3X3,
  History,
  Home,
  Image,
  Info,
  Palette,
  Settings,
  Users,
  Video,
  VideoIcon,
} from 'lucide-react';
import type { ComponentType, MouseEvent } from 'react';
import { Tooltip } from '@heroui/react';
import { useLocation } from '@tanstack/react-router';

import { getDesktopBridge } from '@/lib/desktop-bridge';
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
import MultiPostLogo from './Logo';
import SidebarFeedbackTrigger from './SidebarFeedbackTrigger';
import DashboardSidebarTrigger from './SidebarTrigger';
import { SidebarThemeSwitcher } from './SidebarThemeSwitcher';

interface MenuItem {
  id: string;
  title: string;
  icon: ComponentType;
  path: string;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

function getMenuGroups(basePath: string): MenuGroup[] {
  return [
    {
      label: '基础',
      items: [{ id: 'home', title: '首页', icon: Home, path: basePath }],
    },
    {
      label: '立即发布',
      items: [
        { id: 'publish-dynamic', title: '动态', icon: Image, path: `${basePath}/desktop/publish/dynamic` },
        { id: 'publish-video', title: '视频', icon: Video, path: `${basePath}/desktop/publish/video` },
        { id: 'publish-article', title: '文章', icon: FileText, path: `${basePath}/desktop/publish/article` },
      ],
    },
    {
      label: '内容管理',
      items: [
        { id: 'drafts', title: '草稿箱', icon: FileEdit, path: `${basePath}/desktop/drafts` },
        { id: 'history', title: '发布历史', icon: History, path: `${basePath}/desktop/history` },
      ],
    },
    {
      label: '工具',
      items: [
        { id: 'schedule', title: '定时发布', icon: Calendar, path: `${basePath}/schedule` },
        { id: 'draw', title: 'AI 绘图', icon: Palette, path: `${basePath}/draw` },
        { id: 'grid', title: '九宫格', icon: Grid3X3, path: `${basePath}/grid` },
        { id: 'video-transcribe', title: '视频转文字', icon: VideoIcon, path: `${basePath}/video-transcribe` },
      ],
    },
    {
      label: '账号',
      items: [{ id: 'accounts', title: '账号管理', icon: Users, path: `${basePath}/desktop/accounts` }],
    },
  ];
}

function getFooterItems(basePath: string): MenuItem[] {
  return [
    { id: 'about', title: '关于', icon: Info, path: `${basePath}/desktop/about` },
    { id: 'settings', title: '设置', icon: Settings, path: `${basePath}/desktop/settings` },
  ];
}

function DesktopMenuButton({ item, isActive }: { item: MenuItem; isActive: boolean }) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const bridge = getDesktopBridge();
    if (bridge) {
      event.preventDefault();
      bridge.navigation.navigateTo(item.path);
    }
  };

  return (
    <SidebarMenuButton
      asChild
      isActive={isActive}
      tooltip={item.title}>
      <a
        href={item.path}
        onClick={handleClick}>
        <item.icon />
        <span>{item.title}</span>
      </a>
    </SidebarMenuButton>
  );
}

export function DesktopSidebar({ basePath = '/dashboard' }: { basePath?: string }) {
  const pathname = useLocation({
    select: (location) => location.pathname,
  });
  const menuGroups = getMenuGroups(basePath);
  const footerItems = getFooterItems(basePath);

  const isActive = (path: string) => {
    if (path === basePath) return pathname === basePath;
    return pathname.startsWith(path);
  };

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
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <DesktopMenuButton
                      item={item}
                      isActive={isActive(item.path)}
                    />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarThemeSwitcher />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarFeedbackTrigger />
          </SidebarMenuItem>
          {footerItems.map((item) => (
            <SidebarMenuItem key={item.id}>
              <DesktopMenuButton
                item={item}
                isActive={isActive(item.path)}
              />
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
