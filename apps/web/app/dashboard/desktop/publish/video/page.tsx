'use client';

import { useState } from 'react';
import {
  Avatar,
  Button,
  Card,
  CardBody,
  Checkbox,
  Chip,
  Input,
  Spinner,
  Textarea,
} from '@heroui/react';
import { Film, ImagePlus, Send, Upload, X } from 'lucide-react';
import {
  Account,
  getDesktopBridge,
  PlatformInfo,
  useDesktopAccounts,
  useDesktopPlatforms,
  useIsDesktop,
  VideoData,
} from '@/lib/desktop-bridge';

/**
 * 视频发布页面
 *
 * 功能:
 * - 选择视频文件
 * - 编辑标题、描述、标签
 * - 设置封面
 * - 选择目标平台和账号
 * - 发起发布
 */
export default function VideoPublishPage() {
  const isDesktop = useIsDesktop();
  const { accounts, loading: accountsLoading } = useDesktopAccounts();
  const { platforms, loading: platformsLoading } = useDesktopPlatforms();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [videoPath, setVideoPath] = useState<string | null>(null);
  const [coverPath, setCoverPath] = useState<string | null>(null);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSelectingVideo, setIsSelectingVideo] = useState(false);
  const [isSelectingCover, setIsSelectingCover] = useState(false);

  // 只显示支持视频的平台
  const videoAccounts = accounts.filter((account) => {
    const platform = platforms.find((p) => p.id === account.platform);
    return platform?.supportedContentTypes.includes('VIDEO');
  });

  // 按平台分组账号
  const accountsByPlatform = videoAccounts.reduce(
    (acc, account) => {
      if (!acc[account.platform]) {
        acc[account.platform] = [];
      }
      acc[account.platform].push(account);
      return acc;
    },
    {} as Record<string, Account[]>
  );

  // 获取平台信息
  const getPlatformInfo = (platformId: string): PlatformInfo | undefined => {
    return platforms.find((p) => p.id === platformId);
  };

  // 选择视频
  const handleSelectVideo = async () => {
    const bridge = getDesktopBridge();
    if (!bridge) return;

    setIsSelectingVideo(true);
    try {
      const files = await bridge.app.selectFile({
        filters: [{ name: 'Videos', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'] }],
        multiple: false,
      });
      if (files.length > 0) {
        setVideoPath(files[0]);
      }
    } catch (error) {
      console.error('Failed to select video:', error);
    } finally {
      setIsSelectingVideo(false);
    }
  };

  // 选择封面
  const handleSelectCover = async () => {
    const bridge = getDesktopBridge();
    if (!bridge) return;

    setIsSelectingCover(true);
    try {
      const files = await bridge.app.selectFile({
        filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
        multiple: false,
      });
      if (files.length > 0) {
        setCoverPath(files[0]);
      }
    } catch (error) {
      console.error('Failed to select cover:', error);
    } finally {
      setIsSelectingCover(false);
    }
  };

  // 发布
  const handlePublish = async () => {
    if (!videoPath || !title.trim()) return;
    if (selectedAccounts.length === 0) return;

    const bridge = getDesktopBridge();
    if (!bridge) return;

    setIsPublishing(true);
    try {
      const data: VideoData = {
        title: title.trim(),
        content: description.trim(),
        video: videoPath,
        tags: tags
          .split(/[,，]/)
          .map((t) => t.trim())
          .filter(Boolean),
        cover: coverPath || undefined,
      };

      const targets = selectedAccounts.map((accountId) => {
        const account = accounts.find((a) => a.id === accountId);
        return {
          accountId,
          platform: account?.platform || '',
          displayName: account?.displayName || account?.username,
        };
      });

      await bridge.publish.startInExecutor({
        contentType: 'VIDEO',
        targets,
        data,
        autoSubmit: false,
      });

      bridge.navigation.navigateTo('/dashboard/desktop/executor');
    } catch (error) {
      console.error('Failed to publish:', error);
    } finally {
      setIsPublishing(false);
    }
  };

  // 切换账号选择
  const toggleAccount = (accountId: string) => {
    setSelectedAccounts((prev) =>
      prev.includes(accountId) ? prev.filter((id) => id !== accountId) : [...prev, accountId]
    );
  };

  // 全选某平台的账号
  const togglePlatform = (platformId: string) => {
    const platformAccountIds = accountsByPlatform[platformId]?.map((a) => a.id) || [];
    const allSelected = platformAccountIds.every((id) => selectedAccounts.includes(id));

    if (allSelected) {
      setSelectedAccounts((prev) => prev.filter((id) => !platformAccountIds.includes(id)));
    } else {
      setSelectedAccounts((prev) => [...new Set([...prev, ...platformAccountIds])]);
    }
  };

  if (!isDesktop) {
    return (
      <div className="p-6">
        <Card className="shadow-none border">
          <CardBody>
            <p className="text-muted-foreground">请在 Desktop 应用中打开此页面</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  const loading = accountsLoading || platformsLoading;

  return (
    <div className="p-6 space-y-6">
      {/* 视频选择区 */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">选择视频</h2>

        {videoPath ? (
          <Card className="shadow-none border">
            <CardBody>
              <div className="flex items-center gap-4">
                <div className="w-32 h-20 rounded-lg bg-muted flex items-center justify-center">
                  <Film className="size-8 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{videoPath.split('/').pop()}</p>
                  <p className="text-sm text-muted-foreground truncate">{videoPath}</p>
                </div>
                <Button
                  isIconOnly
                  variant="light"
                  color="danger"
                  onPress={() => setVideoPath(null)}>
                  <X className="size-4" />
                </Button>
              </div>
            </CardBody>
          </Card>
        ) : (
          <Card
            isPressable
            className="shadow-none border border-dashed cursor-pointer hover:bg-muted/50"
            onPress={handleSelectVideo}>
            <CardBody className="py-12">
              <div className="flex flex-col items-center gap-2">
                {isSelectingVideo ? (
                  <Spinner size="lg" />
                ) : (
                  <>
                    <Upload className="size-8 text-muted-foreground" />
                    <p className="text-muted-foreground">点击选择视频文件</p>
                    <p className="text-xs text-muted-foreground">支持 MP4, MOV, AVI, MKV, WebM</p>
                  </>
                )}
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      {/* 视频信息编辑区 */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">视频信息</h2>

        <Input
          label="标题"
          placeholder="输入视频标题"
          value={title}
          onValueChange={setTitle}
          isRequired
        />

        <Textarea
          label="描述"
          placeholder="输入视频描述"
          value={description}
          onValueChange={setDescription}
          minRows={3}
        />

        <Input
          label="标签"
          placeholder="输入标签，用逗号分隔"
          value={tags}
          onValueChange={setTags}
          description="多个标签用逗号分隔"
        />

        {/* 封面设置 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">封面</label>
          {coverPath ? (
            <div className="flex items-center gap-4">
              <div className="w-32 h-20 rounded-lg overflow-hidden bg-muted">
                <img
                  src={`file://${coverPath}`}
                  alt="Cover"
                  className="w-full h-full object-cover"
                />
              </div>
              <Button
                variant="light"
                color="danger"
                size="sm"
                onPress={() => setCoverPath(null)}>
                移除封面
              </Button>
            </div>
          ) : (
            <Button
              variant="bordered"
              startContent={
                isSelectingCover ? <Spinner size="sm" /> : <ImagePlus className="size-4" />
              }
              onPress={handleSelectCover}
              isDisabled={isSelectingCover}>
              选择封面图片
            </Button>
          )}
        </div>
      </div>

      {/* 账号选择区 */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">选择发布账号</h2>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : videoAccounts.length === 0 ? (
          <Card className="shadow-none border">
            <CardBody className="py-8 text-center">
              <p className="text-muted-foreground">没有支持视频发布的账号</p>
              <Button
                className="mt-4"
                variant="flat"
                onPress={() => {
                  const bridge = getDesktopBridge();
                  bridge?.navigation.navigateTo('/dashboard/desktop/accounts');
                }}>
                去添加账号
              </Button>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.entries(accountsByPlatform).map(([platformId, platformAccounts]) => {
              const platformInfo = getPlatformInfo(platformId);
              const allSelected = platformAccounts.every((a) => selectedAccounts.includes(a.id));
              const someSelected =
                platformAccounts.some((a) => selectedAccounts.includes(a.id)) && !allSelected;

              return (
                <Card
                  key={platformId}
                  className="shadow-none border">
                  <CardBody className="gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          isSelected={allSelected}
                          isIndeterminate={someSelected}
                          onValueChange={() => togglePlatform(platformId)}
                        />
                        <span className="font-medium">{platformInfo?.name || platformId}</span>
                        <Chip
                          size="sm"
                          variant="flat">
                          {platformAccounts.length}
                        </Chip>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 ml-6">
                      {platformAccounts.map((account) => (
                        <div
                          key={account.id}
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                            selectedAccounts.includes(account.id)
                              ? 'bg-primary/10'
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => toggleAccount(account.id)}>
                          <Checkbox
                            isSelected={selectedAccounts.includes(account.id)}
                            onValueChange={() => toggleAccount(account.id)}
                          />
                          <Avatar
                            src={account.avatar}
                            name={account.displayName || account.username}
                            size="sm"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {account.displayName || account.username}
                            </p>
                            {!account.isLoggedIn && (
                              <p className="text-xs text-warning">未登录</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* 发布按钮 */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-sm text-muted-foreground">
          已选择 {selectedAccounts.length} 个账号
        </div>
        <Button
          color="primary"
          size="lg"
          startContent={isPublishing ? <Spinner size="sm" /> : <Send className="size-4" />}
          isDisabled={
            isPublishing || selectedAccounts.length === 0 || !videoPath || !title.trim()
          }
          onPress={handlePublish}>
          {isPublishing ? '发布中...' : '发布'}
        </Button>
      </div>
    </div>
  );
}
