'use client';

/**
 * 发布页面布局
 *
 * Desktop 模式下不需要 Tab 导航，因为侧边栏已经有发布类型切换
 * 此布局只提供统一的容器样式
 */
export default function PublishLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
