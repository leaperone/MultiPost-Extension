'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  FileEdit,
  FileText,
  History,
  Home,
  Image,
  Info,
  Settings,
  Terminal,
  Users,
  Video,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDesktopBridge } from '@/lib/desktop-bridge';

interface MenuItem {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    label: '基础',
    items: [{ id: 'home', title: '首页', icon: Home, path: '/desktop' }],
  },
  {
    label: '立即发布',
    items: [
      { id: 'publish-dynamic', title: '动态', icon: Image, path: '/desktop/publish/dynamic' },
      { id: 'publish-video', title: '视频', icon: Video, path: '/desktop/publish/video' },
      { id: 'publish-article', title: '文章', icon: FileText, path: '/desktop/publish/article' },
    ],
  },
  {
    label: '内容管理',
    items: [
      { id: 'drafts', title: '草稿箱', icon: FileEdit, path: '/desktop/drafts' },
      { id: 'history', title: '发布历史', icon: History, path: '/desktop/history' },
    ],
  },
  {
    label: '账号',
    items: [{ id: 'accounts', title: '账号管理', icon: Users, path: '/desktop/accounts' }],
  },
];

const footerItems: MenuItem[] = [
  { id: 'about', title: '关于', icon: Info, path: '/desktop/about' },
  { id: 'settings', title: '设置', icon: Settings, path: '/desktop/settings' },
];

function MenuButton({
  item,
  isActive,
}: {
  item: MenuItem;
  isActive: boolean;
}) {
  const handleClick = () => {
    const bridge = getDesktopBridge();
    if (bridge) {
      bridge.navigation.navigateTo(item.path);
    }
  };

  return (
    <Link
      href={item.path}
      onClick={(e) => {
        // 在 Desktop 环境下阻止默认导航，使用 bridge
        const bridge = getDesktopBridge();
        if (bridge) {
          e.preventDefault();
          handleClick();
        }
      }}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
        isActive
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}>
      <item.icon className="size-4" />
      <span>{item.title}</span>
    </Link>
  );
}

export function DesktopSidebar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/desktop') {
      return pathname === '/desktop';
    }
    return pathname.startsWith(path);
  };

  return (
    <aside className="flex h-dvh w-64 flex-col border-r bg-card flex-shrink-0">
      {/* Logo */}
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/desktop" className="flex items-center gap-2">
          <span className="font-semibold bg-gradient-to-br from-blue-300 to-pink-600 dark:from-blue-400 dark:to-pink-400 bg-clip-text text-transparent text-lg">
            MultiPost
          </span>
        </Link>
      </div>

      {/* 菜单 */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {menuGroups.map((group) => (
          <div key={group.label}>
            <h3 className="mb-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {group.label}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => (
                <MenuButton key={item.id} item={item} isActive={isActive(item.path)} />
              ))}
            </div>
          </div>
        ))}

        {/* 执行器（如果有打开的执行器） */}
        {/* TODO: 从 Desktop Bridge 获取执行器状态 */}
      </nav>

      {/* Footer - 添加底部安全区域 */}
      <div className="flex-shrink-0 border-t p-4 pb-6 space-y-1">
        {footerItems.map((item) => (
          <MenuButton key={item.id} item={item} isActive={isActive(item.path)} />
        ))}
      </div>
    </aside>
  );
}
