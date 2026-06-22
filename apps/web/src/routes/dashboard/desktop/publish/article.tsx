import { createFileRoute } from '@tanstack/react-router';
import { Button, Card, CardBody, Input, Textarea } from '@heroui/react';
import { ImagePlusIcon, SendIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  getDesktopErrorMessage,
  getDesktopBridge,
  useDesktopAccounts,
  useDesktopPlatforms,
  useIsDesktop,
  type ArticleData,
} from '@/lib/desktop-bridge';
import {
  AccountSelection,
  DesktopPageShell,
  DesktopRequiredCard,
  getAccountLabel,
  LoadingState,
} from '../-components';

export const Route = createFileRoute('/dashboard/desktop/publish/article')({
  component: ArticlePublishPage,
});

function ArticlePublishPage() {
  const isDesktop = useIsDesktop();
  const { accounts, loading: accountsLoading } = useDesktopAccounts();
  const { platforms, loading: platformsLoading } = useDesktopPlatforms();
  const [title, setTitle] = useState('');
  const [digest, setDigest] = useState('');
  const [content, setContent] = useState('');
  const [coverPath, setCoverPath] = useState('');
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

  const selectCover = async () => {
    const bridge = getDesktopBridge();
    if (!bridge) return;

    const files = await bridge.app.selectFile({
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
      multiple: false,
    });
    if (files[0]) setCoverPath(files[0]);
  };

  const publish = async () => {
    const bridge = getDesktopBridge();
    if (!bridge || !title.trim() || !content.trim() || selectedAccounts.length === 0) return;

    setIsPublishing(true);
    try {
      const markdownContent = content.trim();
      const data: ArticleData = {
        title: title.trim(),
        digest: digest.trim() || markdownContent.slice(0, 200),
        cover: coverPath,
        htmlContent: '',
        markdownContent,
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
        contentType: 'ARTICLE',
        targets,
        data,
        autoSubmit: false,
      });
      bridge.navigation.navigateTo('/dashboard/desktop/executor');
    } catch (error) {
      console.error('Failed to publish article:', error);
      toast.error('发布没成功', {
        description: getDesktopErrorMessage(error, '请检查账号登录状态后重试。'),
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <DesktopPageShell
      title="Publish Article"
      description="Write an article and send it through Desktop accounts."
      actions={
        <Button
          color="primary"
          startContent={<SendIcon className="size-4" />}
          isLoading={isPublishing}
          isDisabled={!title.trim() || !content.trim() || selectedAccounts.length === 0}
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
              <Input
                label="Title"
                value={title}
                onValueChange={setTitle}
                isRequired
              />
              <Input
                label="Digest"
                description="Optional. Defaults to the first 200 characters."
                value={digest}
                onValueChange={setDigest}
              />
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="bordered"
                  startContent={<ImagePlusIcon className="size-4" />}
                  onPress={selectCover}>
                  {coverPath ? 'Change cover' : 'Select cover'}
                </Button>
                {coverPath ? <span className="text-sm text-muted-foreground">{coverPath}</span> : null}
              </div>
              <Textarea
                label="Markdown content"
                minRows={12}
                value={content}
                onValueChange={setContent}
                isRequired
              />
            </CardBody>
          </Card>

          <AccountSelection
            accounts={accounts}
            platforms={platforms}
            contentType="ARTICLE"
            selected={selectedAccounts}
            onToggle={toggleAccount}
          />
        </>
      )}
    </DesktopPageShell>
  );
}
