'use client';

import { useState } from 'react';
import {
  Avatar,
  Button,
  Card,
  CardBody,
  Checkbox,
  Chip,
  Image,
  Spinner,
  Textarea,
} from '@heroui/react';
import { ImagePlus, Send, X } from 'lucide-react';
import {
  Account,
  DynamicData,
  getDesktopBridge,
  PlatformInfo,
  useDesktopAccounts,
  useDesktopPlatforms,
  useIsDesktop,
  createAndShowPublishGroup,
} from '@/lib/desktop-bridge';

// 图片信息，包含原始路径和预览 URL
interface ImageItem {
  path: string; // 原始文件路径，用于发布
  previewUrl: string; // 预览 URL（data URL），用于显示
}

/**
 * 动态发布页面
 *
 * 功能:
 * - 编辑文字内容
 * - 上传图片
 * - 选择目标平台和账号
 * - 发起发布 (使用 Publish Group)
 */
export default function DynamicPublishPage() {
  const isDesktop = useIsDesktop();
  const { accounts, loading: accountsLoading } = useDesktopAccounts();
  const { platforms, loading: platformsLoading } = useDesktopPlatforms();

  const [content, setContent] = useState('');
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSelectingFiles, setIsSelectingFiles] = useState(false);

  // 只显示支持动态的平台
  const dynamicAccounts = accounts.filter((account) => {
    const platform = platforms.find((p) => p.id === account.platform);
    return platform?.supportedContentTypes.includes('DYNAMIC');
  });

  // 按平台分组账号
  const accountsByPlatform = dynamicAccounts.reduce(
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

  // 选择图片
  const handleSelectImages = async () => {
    const bridge = getDesktopBridge();
    if (!bridge) return;

    setIsSelectingFiles(true);
    try {
      const files = await bridge.app.selectFile({
        filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }],
        multiple: true,
      });
      if (files.length > 0) {
        // 将文件路径转换为预览 URL
        const newImages: ImageItem[] = await Promise.all(
          files.map(async (filePath) => {
            try {
              const dataUrl = await bridge.app.readFileAsDataURL(filePath);
              return { path: filePath, previewUrl: dataUrl };
            } catch (error) {
              console.error('Failed to read file:', filePath, error);
              // 降级处理：使用 file:// 协议（可能不工作，但保持兼容）
              return { path: filePath, previewUrl: `file://${filePath}` };
            }
          })
        );
        setImages((prev) => [...prev, ...newImages]);
      }
    } catch (error) {
      console.error('Failed to select images:', error);
    } finally {
      setIsSelectingFiles(false);
    }
  };

  // 移除图片
  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // 发布 - 使用 Publish Group
  const handlePublish = async () => {
    if (!content.trim() && images.length === 0) return;
    if (selectedAccounts.length === 0) return;

    setIsPublishing(true);
    try {
      const data: DynamicData = {
        content: content.trim(),
        images: images.map((img) => img.path), // 发布时使用原始文件路径
      };

      const targets = selectedAccounts.map((accountId) => {
        const account = accounts.find((a) => a.id === accountId);
        return {
          accountId,
          platform: account?.platform || '',
          displayName: account?.displayName || account?.username || account?.platform || '',
        };
      });

      // 使用 Publish Group API 创建发布组
      const groupId = await createAndShowPublishGroup({
        contentType: 'DYNAMIC',
        targets,
        data,
      });

      if (groupId) {
        console.log('[DynamicPublishPage] Publish group created:', groupId);
        // Group 创建成功后会自动切换到 Group tab，无需额外导航
      } else {
        console.error('[DynamicPublishPage] Failed to create publish group');
      }
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
      {/* 内容编辑区 */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">发布动态</h2>

        <Textarea
          placeholder="写点什么..."
          value={content}
          onValueChange={setContent}
          minRows={4}
          maxRows={10}
          classNames={{
            input: 'text-base',
          }}
        />

        {/* 图片列表 */}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {images.map((image, index) => (
              <div
                key={image.path}
                className="relative group">
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted">
                  <Image
                    src={image.previewUrl}
                    alt={`Image ${index + 1}`}
                    removeWrapper
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  className="absolute -top-2 -right-2 bg-danger text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemoveImage(index)}>
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 添加图片按钮 */}
        <Button
          variant="bordered"
          startContent={
            isSelectingFiles ? <Spinner size="sm" /> : <ImagePlus className="size-4" />
          }
          onPress={handleSelectImages}
          isDisabled={isSelectingFiles}>
          添加图片
        </Button>
      </div>

      {/* 账号选择区 */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">选择发布账号</h2>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : dynamicAccounts.length === 0 ? (
          <Card className="shadow-none border">
            <CardBody className="py-8 text-center">
              <p className="text-muted-foreground">没有支持动态发布的账号</p>
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
                    {/* 平台标题 */}
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

                    {/* 账号列表 */}
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
            isPublishing ||
            selectedAccounts.length === 0 ||
            (!content.trim() && images.length === 0)
          }
          onPress={handlePublish}>
          {isPublishing ? '发布中...' : '发布'}
        </Button>
      </div>
    </div>
  );
}
