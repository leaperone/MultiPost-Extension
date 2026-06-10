'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  History,
  Image,
  Send,
  SparklesIcon,
  Users,
  Video,
} from 'lucide-react';
import { getDesktopBridge, useIsDesktop } from '@/lib/desktop-bridge';
import { Card } from '@heroui/react';

interface QuickAction {
  title: string;
  description: string;
  icon: React.ReactNode;
  iconColor: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'default';
  path: string;
}

const quickActions: QuickAction[] = [
  {
    title: '发布动态',
    description: '发布图文内容到多个平台',
    icon: <Image className="size-10 text-blue-500 dark:text-blue-400 sm:size-14" />,
    iconColor: 'primary',
    path: '/dashboard/desktop/publish/dynamic',
  },
  {
    title: '发布视频',
    description: '发布视频到多个平台',
    icon: <Video className="size-10 text-purple-500 dark:text-purple-400 sm:size-14" />,
    iconColor: 'secondary',
    path: '/dashboard/desktop/publish/video',
  },
  {
    title: '发布文章',
    description: '发布长文章到多个平台',
    icon: <FileText className="size-10 text-slate-500 dark:text-slate-400 sm:size-14" />,
    iconColor: 'default',
    path: '/dashboard/desktop/publish/article',
  },
  {
    title: '账号管理',
    description: '管理已登录的社交媒体账号',
    icon: <Users className="size-10 text-pink-500 dark:text-pink-400 sm:size-14" />,
    iconColor: 'danger',
    path: '/dashboard/desktop/accounts',
  },
  {
    title: '草稿箱',
    description: '查看和编辑保存的草稿',
    icon: <Send className="size-10 text-amber-500 dark:text-amber-400 sm:size-14" />,
    iconColor: 'warning',
    path: '/dashboard/desktop/drafts',
  },
  {
    title: '发布历史',
    description: '查看历史发布记录',
    icon: <History className="size-10 text-green-500 dark:text-green-400 sm:size-14" />,
    iconColor: 'success',
    path: '/dashboard/desktop/history',
  },
];

export default function DesktopHomeContent() {
  const isDesktop = useIsDesktop();
  const [version, setVersion] = useState<string>('');
  const [accountCount, setAccountCount] = useState<number>(0);

  useEffect(() => {
    const bridge = getDesktopBridge();
    if (bridge) {
      bridge.app.getVersion().then(setVersion);
      bridge.account.list().then((accounts) => setAccountCount(accounts.length));
    }
  }, []);

  const handleNavigate = (path: string) => {
    const bridge = getDesktopBridge();
    if (bridge) {
      bridge.navigation.navigateTo(path);
    } else if (typeof window !== 'undefined') {
      window.location.assign(path);
    }
  };

  return (
    <div className="relative h-full">
      {/* Background layers */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('https://i.ibb.co/xtN61cRf/Comfy-UI-Output-4-1.png')",
        }}
      />
      <div className="absolute inset-0 bg-background/80" />

      {/* Scrollable Content */}
      <div className="relative z-10 h-full overflow-y-auto">
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <motion.div
            className="mb-8 sm:mb-12"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}>
            <div className="flex items-center gap-2">
              <SparklesIcon className="size-6 text-amber-500" />
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
                MultiPost Desktop
              </h1>
            </div>
            {isDesktop && (
              <p className="mt-2 text-muted-foreground">
                版本 {version} · 已登录 {accountCount} 个账号
              </p>
            )}
          </motion.div>

          {/* Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.path}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5, ease: 'easeOut' }}
                onClick={() => handleNavigate(action.path)}
                className="cursor-pointer">
                <Card className="shadow-none border group h-full p-6 sm:p-8 transition-all duration-300 hover:scale-[1.02]">
                  <div className="flex flex-col items-center gap-4 sm:gap-6">
                    <div className="flex items-center justify-center rounded-full bg-default-100 size-32 transition-transform duration-300 group-hover:scale-110">
                      {action.icon}
                    </div>
                    <div className="space-y-2 text-center">
                      <h3 className="text-lg font-semibold text-foreground sm:text-xl">
                        {action.title}
                      </h3>
                      <p className="text-sm text-muted-foreground sm:text-base">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="h-8" />
        </div>
      </div>
    </div>
  );
}
