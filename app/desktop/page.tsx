'use client';

import { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '@heroui/react';
import { FileText, History, Image, Send, Settings, Users, Video } from 'lucide-react';
import { getDesktopBridge, useIsDesktop } from '@/lib/desktop-bridge';

interface QuickAction {
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
}

const quickActions: QuickAction[] = [
  {
    title: '发布动态',
    description: '发布图文内容到多个平台',
    icon: <Image className="size-6" />,
    path: '/desktop/publish/dynamic',
  },
  {
    title: '发布视频',
    description: '发布视频到多个平台',
    icon: <Video className="size-6" />,
    path: '/desktop/publish/video',
  },
  {
    title: '发布文章',
    description: '发布长文章到多个平台',
    icon: <FileText className="size-6" />,
    path: '/desktop/publish/article',
  },
  {
    title: '账号管理',
    description: '管理已登录的社交媒体账号',
    icon: <Users className="size-6" />,
    path: '/desktop/accounts',
  },
  {
    title: '草稿箱',
    description: '查看和编辑保存的草稿',
    icon: <Send className="size-6" />,
    path: '/desktop/drafts',
  },
  {
    title: '发布历史',
    description: '查看历史发布记录',
    icon: <History className="size-6" />,
    path: '/desktop/history',
  },
];

/**
 * Desktop 首页
 *
 * 显示快捷操作入口和基本统计信息
 */
export default function DesktopHomePage() {
  const isDesktop = useIsDesktop();
  const [version, setVersion] = useState<string>('');
  const [accountCount, setAccountCount] = useState<number>(0);

  useEffect(() => {
    const bridge = getDesktopBridge();
    if (bridge) {
      // 获取版本号
      bridge.app.getVersion().then(setVersion);
      // 获取账号数量
      bridge.account.list().then((accounts) => setAccountCount(accounts.length));
    }
  }, []);

  const handleNavigate = (path: string) => {
    const bridge = getDesktopBridge();
    if (bridge) {
      bridge.navigation.navigateTo(path);
    } else {
      // 降级处理：使用 router 或直接修改 location
      if (typeof window !== 'undefined') {
        window.location.assign(path);
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* 欢迎信息 */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">欢迎使用 MultiPost Desktop</h1>
        <p className="text-muted-foreground">
          {isDesktop ? (
            <>
              版本 {version} · 已登录 {accountCount} 个账号
            </>
          ) : (
            '请在 Desktop 应用中打开此页面'
          )}
        </p>
      </div>

      {/* 快捷操作 */}
      <div>
        <h2 className="text-lg font-semibold mb-4">快捷操作</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Card
              key={action.path}
              isPressable
              className="shadow-none border cursor-pointer hover:bg-muted/50 transition-colors"
              onPress={() => handleNavigate(action.path)}>
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <div className="text-muted-foreground">{action.icon}</div>
                <span className="font-medium">{action.title}</span>
              </CardHeader>
              <CardBody className="pt-0">
                <p className="text-sm text-muted-foreground">{action.description}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>

      {/* 非 Desktop 环境提示 */}
      {!isDesktop && (
        <Card className="shadow-none border border-yellow-500/50 bg-yellow-500/10">
          <CardBody>
            <div className="flex items-center gap-3">
              <Settings className="size-5 text-yellow-500" />
              <div>
                <p className="font-medium">Desktop 环境未检测到</p>
                <p className="text-sm text-muted-foreground">
                  此页面设计用于 MultiPost Desktop 应用。部分功能在浏览器中可能无法正常使用。
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
