'use client';

import { useEffect, useState } from 'react';
import { Card, CardBody, Button, Link } from '@heroui/react';
import { ExternalLink, Github, Globe, Heart } from 'lucide-react';
import { getDesktopBridge, useIsDesktop } from '@/lib/desktop-bridge';

/**
 * Desktop 关于页面
 */
export default function DesktopAboutPage() {
  const isDesktop = useIsDesktop();
  const [version, setVersion] = useState<string>('');
  const [platform, setPlatform] = useState<string>('');

  useEffect(() => {
    const bridge = getDesktopBridge();
    if (bridge) {
      bridge.app.getVersion().then(setVersion);
      setPlatform(bridge.env.platform);
    }
  }, []);

  const handleOpenExternal = async (url: string) => {
    const bridge = getDesktopBridge();
    if (bridge) {
      await bridge.app.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="text-center space-y-4 py-8">
        {/* Logo */}
        <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-400 to-pink-500 flex items-center justify-center">
          <span className="text-white text-3xl font-bold">M</span>
        </div>

        {/* 名称和版本 */}
        <div>
          <h1 className="text-2xl font-bold">MultiPost Desktop</h1>
          <p className="text-muted-foreground">
            {version ? `版本 ${version}` : '加载中...'} · {platform || 'Web'}
          </p>
        </div>

        {/* 描述 */}
        <p className="text-muted-foreground max-w-md mx-auto">
          一键发布内容到多个社交媒体平台，提高内容分发效率
        </p>
      </div>

      {/* 链接 */}
      <Card className="shadow-none border">
        <CardBody className="space-y-2">
          <Button
            variant="light"
            className="w-full justify-start"
            startContent={<Globe className="size-4" />}
            endContent={<ExternalLink className="size-4 text-muted-foreground" />}
            onPress={() => handleOpenExternal('https://multipost.app')}>
            官方网站
          </Button>
          <Button
            variant="light"
            className="w-full justify-start"
            startContent={<Github className="size-4" />}
            endContent={<ExternalLink className="size-4 text-muted-foreground" />}
            onPress={() => handleOpenExternal('https://github.com/leaper-one/multipost')}>
            GitHub 仓库
          </Button>
          <Button
            variant="light"
            className="w-full justify-start"
            startContent={<Heart className="size-4" />}
            endContent={<ExternalLink className="size-4 text-muted-foreground" />}
            onPress={() => handleOpenExternal('https://multipost.app/pricing')}>
            支持我们
          </Button>
        </CardBody>
      </Card>

      {/* 版权信息 */}
      <div className="text-center text-sm text-muted-foreground space-y-1">
        <p>© 2024-2026 Leaper One. All rights reserved.</p>
        <p>
          <Link
            href="#"
            className="text-sm"
            onPress={() => handleOpenExternal('https://multipost.app/legal/privacy')}>
            隐私政策
          </Link>
          {' · '}
          <Link
            href="#"
            className="text-sm"
            onPress={() => handleOpenExternal('https://multipost.app/legal/terms')}>
            服务条款
          </Link>
        </p>
      </div>
    </div>
  );
}
