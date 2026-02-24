'use client';

import { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader, Switch, Divider } from '@heroui/react';
import { getDesktopBridge, useIsDesktop } from '@/lib/desktop-bridge';

/**
 * Desktop 设置页面
 */
export default function DesktopSettingsPage() {
  const isDesktop = useIsDesktop();
  const [version, setVersion] = useState<string>('');

  useEffect(() => {
    const bridge = getDesktopBridge();
    if (bridge) {
      bridge.app.getVersion().then(setVersion);
    }
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">设置</h1>
        <p className="text-muted-foreground">管理应用程序设置</p>
      </div>

      {/* 应用信息 */}
      <Card className="shadow-none border">
        <CardHeader>
          <h2 className="font-semibold">应用信息</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">版本</span>
            <span>{version || '加载中...'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">运行环境</span>
            <span>{isDesktop ? 'Desktop' : 'Web'}</span>
          </div>
        </CardBody>
      </Card>

      {/* 通用设置 */}
      <Card className="shadow-none border">
        <CardHeader>
          <h2 className="font-semibold">通用</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">开机自启动</p>
              <p className="text-sm text-muted-foreground">系统启动时自动运行 MultiPost</p>
            </div>
            <Switch isDisabled={!isDesktop} />
          </div>
          <Divider />
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">自动检查更新</p>
              <p className="text-sm text-muted-foreground">启动时检查是否有新版本</p>
            </div>
            <Switch defaultSelected isDisabled={!isDesktop} />
          </div>
        </CardBody>
      </Card>

      {/* 发布设置 */}
      <Card className="shadow-none border">
        <CardHeader>
          <h2 className="font-semibold">发布</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">自动保存草稿</p>
              <p className="text-sm text-muted-foreground">编辑内容时自动保存到草稿箱</p>
            </div>
            <Switch defaultSelected />
          </div>
          <Divider />
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">发布后自动关闭执行器</p>
              <p className="text-sm text-muted-foreground">发布完成后关闭平台浏览器窗口</p>
            </div>
            <Switch />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
