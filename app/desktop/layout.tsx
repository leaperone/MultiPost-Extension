'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ToastProvider } from '@heroui/react';
import { getDesktopBridge } from '@/lib/desktop-bridge';
import { DesktopSidebar } from '@/components/desktop/sidebar';

/**
 * Desktop 专用布局
 *
 * 特点:
 * - 自带侧边栏导航（Web 实现）
 * - 无顶部导航栏
 * - 路径同步到 Desktop
 */
export default function DesktopLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  // 同步当前路径到 Desktop
  useEffect(() => {
    const bridge = getDesktopBridge();
    if (bridge) {
      bridge.navigation.reportPath(pathname);
    }
  }, [pathname]);

  return (
    <div className="desktop-layout h-dvh flex bg-background overflow-hidden">
      <ToastProvider />

      {/* 侧边栏 */}
      <DesktopSidebar />

      {/* 主内容区 */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
