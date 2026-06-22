import { createFileRoute } from '@tanstack/react-router';
import { Button, Card, CardBody, Input, Textarea } from '@heroui/react';
import { FilmIcon, ImagePlusIcon, SendIcon, XIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  getDesktopErrorMessage,
  getDesktopBridge,
  useDesktopAccounts,
  useDesktopPlatforms,
  useIsDesktop,
  type VideoData,
} from '@/lib/desktop-bridge';
import {
  AccountSelection,
  DesktopPageShell,
  DesktopRequiredCard,
  getAccountLabel,
  LoadingState,
} from '../-components';

export const Route = createFileRoute('/dashboard/desktop/publish/video')({
  component: VideoPublishPage,
});

function VideoPublishPage() {
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

  if (!isDesktop) return <DesktopRequiredCard />;

  const loading = accountsLoading || platformsLoading;

  const toggleAccount = (accountId: string) => {
    setSelectedAccounts((previous) =>
      previous.includes(accountId)
        ? previous.filter((id) => id !== accountId)
        : [...previous, accountId],
    );
  };

  const selectFile = async (kind: 'video' | 'cover') => {
    const bridge = getDesktopBridge();
    if (!bridge) return;

    const files = await bridge.app.selectFile({
      filters:
        kind === 'video'
          ? [{ name: 'Videos', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'] }]
          : [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
      multiple: false,
    });
    if (!files[0]) return;
    if (kind === 'video') setVideoPath(files[0]);
    else setCoverPath(files[0]);
  };

  const publish = async () => {
    const bridge = getDesktopBridge();
    if (!bridge || !videoPath || !title.trim() || selectedAccounts.length === 0) return;

    setIsPublishing(true);
    try {
      const data: VideoData = {
        title: title.trim(),
        content: description.trim(),
        video: videoPath,
        cover: coverPath || undefined,
        tags: tags
          .split(/[,，]/)
          .map((tag) => tag.trim())
          .filter(Boolean),
      };
      const targets = selectedAccounts.map((accountId) => {
        const account = accounts.find((item) => item.id === accountId);
        return {
          accountId,
          platform: account?.platform || '',
          displayName: account ? getAccountLabel(account) : accountId,
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
      console.error('Failed to publish video:', error);
      toast.error('发布没成功', {
        description: getDesktopErrorMessage(error, '请检查账号登录状态后重试。'),
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <DesktopPageShell
      title="Publish Video"
      description="Select a video file and target Desktop accounts."
      actions={
        <Button
          color="primary"
          startContent={<SendIcon className="size-4" />}
          isLoading={isPublishing}
          isDisabled={!videoPath || !title.trim() || selectedAccounts.length === 0}
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
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="bordered"
                  startContent={<FilmIcon className="size-4" />}
                  onPress={() => selectFile('video')}>
                  {videoPath ? 'Change video' : 'Select video'}
                </Button>
                <Button
                  variant="bordered"
                  startContent={<ImagePlusIcon className="size-4" />}
                  onPress={() => selectFile('cover')}>
                  {coverPath ? 'Change cover' : 'Select cover'}
                </Button>
              </div>
              {videoPath ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FilmIcon className="size-4" />
                  {videoPath}
                  <Button
                    size="sm"
                    variant="light"
                    isIconOnly
                    onPress={() => setVideoPath(null)}>
                    <XIcon className="size-4" />
                  </Button>
                </p>
              ) : null}
              {coverPath ? <p className="text-sm text-muted-foreground">Cover: {coverPath}</p> : null}
              <Input
                label="Title"
                value={title}
                onValueChange={setTitle}
                isRequired
              />
              <Textarea
                label="Description"
                value={description}
                onValueChange={setDescription}
              />
              <Input
                label="Tags"
                description="Separate tags with commas."
                value={tags}
                onValueChange={setTags}
              />
            </CardBody>
          </Card>

          <AccountSelection
            accounts={accounts}
            platforms={platforms}
            contentType="VIDEO"
            selected={selectedAccounts}
            onToggle={toggleAccount}
          />
        </>
      )}
    </DesktopPageShell>
  );
}
