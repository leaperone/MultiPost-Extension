import { createFileRoute } from '@tanstack/react-router';
import { Button, Card, CardBody, Image, Spinner, Textarea } from '@heroui/react';
import { ImagePlusIcon, SendIcon, XIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  createAndShowPublishGroup,
  getDesktopErrorMessage,
  getDesktopBridge,
  useDesktopAccounts,
  useDesktopPlatforms,
  useIsDesktop,
  type DynamicData,
} from '@/lib/desktop-bridge';
import {
  AccountSelection,
  DesktopPageShell,
  DesktopRequiredCard,
  getAccountLabel,
  LoadingState,
} from '../-components';

export const Route = createFileRoute('/dashboard/desktop/publish/dynamic')({
  component: DynamicPublishPage,
});

type ImageItem = {
  path: string;
  previewUrl: string;
};

function DynamicPublishPage() {
  const isDesktop = useIsDesktop();
  const { accounts, loading: accountsLoading } = useDesktopAccounts();
  const { platforms, loading: platformsLoading } = useDesktopPlatforms();
  const [content, setContent] = useState('');
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  if (!isDesktop) return <DesktopRequiredCard />;

  const loading = accountsLoading || platformsLoading;

  const toggleAccount = (accountId: string) => {
    setSelectedAccounts((previous) =>
      previous.includes(accountId)
        ? previous.filter((id) => id !== accountId)
        : [...previous, accountId],
    );
  };

  const selectImages = async () => {
    const bridge = getDesktopBridge();
    if (!bridge) return;

    setIsSelecting(true);
    try {
      const files = await bridge.app.selectFile({
        filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }],
        multiple: true,
      });
      const nextImages = await Promise.all(
        files.map(async (path) => {
          try {
            return { path, previewUrl: await bridge.app.readFileAsDataURL(path) };
          } catch {
            return { path, previewUrl: `file://${path}` };
          }
        }),
      );
      setImages((previous) => [...previous, ...nextImages]);
    } finally {
      setIsSelecting(false);
    }
  };

  const publish = async () => {
    const bridge = getDesktopBridge();
    if (!bridge || selectedAccounts.length === 0 || (!content.trim() && images.length === 0)) return;

    setIsPublishing(true);
    try {
      const data: DynamicData = {
        content: content.trim(),
        images: images.map((image) => image.path),
      };
      const targets = selectedAccounts.map((accountId) => {
        const account = accounts.find((item) => item.id === accountId);
        return {
          accountId,
          platform: account?.platform || '',
          displayName: account ? getAccountLabel(account) : accountId,
        };
      });

      const groupId = await createAndShowPublishGroup({
        contentType: 'DYNAMIC',
        targets,
        data,
      });

      if (!groupId) {
        await bridge.publish.startInExecutor({
          contentType: 'DYNAMIC',
          targets,
          data,
          autoSubmit: false,
        });
        bridge.navigation.navigateTo('/dashboard/desktop/executor');
      }
    } catch (error) {
      console.error('Failed to publish dynamic:', error);
      toast.error('发布没成功', {
        description: getDesktopErrorMessage(error, '请检查账号登录状态后重试。'),
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <DesktopPageShell
      title="Publish Dynamic"
      description="Create a text or image post for Desktop accounts."
      actions={
        <Button
          color="primary"
          startContent={<SendIcon className="size-4" />}
          isLoading={isPublishing}
          isDisabled={selectedAccounts.length === 0 || (!content.trim() && images.length === 0)}
          onPress={publish}>
          Publish
        </Button>
      }>
      {loading ? (
        <LoadingState />
      ) : (
        <>
          <Card className="shadow-none border">
            <CardBody className="gap-4">
              <Textarea
                minRows={4}
                maxRows={10}
                placeholder="Write something..."
                value={content}
                onValueChange={setContent}
              />
              {images.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {images.map((image, index) => (
                    <div
                      key={`${image.path}-${index}`}
                      className="group relative">
                      <Image
                        src={image.previewUrl}
                        alt=""
                        removeWrapper
                        className="size-24 rounded-lg object-cover"
                      />
                      <Button
                        size="sm"
                        color="danger"
                        isIconOnly
                        className="absolute -right-2 -top-2 z-10 opacity-0 group-hover:opacity-100"
                        onPress={() =>
                          setImages((previous) => previous.filter((_, itemIndex) => itemIndex !== index))
                        }>
                        <XIcon className="size-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}
              <Button
                variant="bordered"
                startContent={isSelecting ? <Spinner size="sm" /> : <ImagePlusIcon className="size-4" />}
                isDisabled={isSelecting}
                onPress={selectImages}>
                Add images
              </Button>
            </CardBody>
          </Card>

          <AccountSelection
            accounts={accounts}
            platforms={platforms}
            contentType="DYNAMIC"
            selected={selectedAccounts}
            onToggle={toggleAccount}
          />
        </>
      )}
    </DesktopPageShell>
  );
}
