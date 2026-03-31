'use client';

import { useMemo, useState, useTransition } from 'react';
import { Button, Chip } from '@heroui/react';
import { Icon } from '@iconify/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  cancelFacebookPagesSelection,
  connectFacebookPage,
} from '@/actions/social-media-accounts/facebook-pages';
import { useTranslation } from '@/i18n/client';

interface FacebookSelectablePage {
  id: string;
  name: string;
  category?: string;
  username?: string;
  tasks?: string[];
}

interface Props {
  pages: FacebookSelectablePage[];
}

export default function FacebookPagesSelector({ pages }: Props) {
  const router = useRouter();
  const { t } = useTranslation('settings');
  const [selectedPageId, setSelectedPageId] = useState<string | null>(pages[0]?.id ?? null);
  const [isPending, startTransition] = useTransition();
  const [isCancelling, startCancelTransition] = useTransition();

  const selectedPageName = useMemo(() => {
    return pages.find((page) => page.id === selectedPageId)?.name ?? null;
  }, [pages, selectedPageId]);

  const handleConfirm = () => {
    if (!selectedPageId) {
      toast.error(t('socialAccounts.facebook.selectPrompt'));
      return;
    }

    startTransition(async () => {
      try {
        await connectFacebookPage(selectedPageId);
        toast.success(t('socialAccounts.toast.connectedSuccess'));
        router.push('/dashboard/settings/social-media-accounts?success=facebook_connected');
      } catch (error) {
        console.error('Failed to connect Facebook page:', error);
        toast.error(t('socialAccounts.toast.connectFailed'));
      }
    });
  };

  const handleCancel = () => {
    startCancelTransition(async () => {
      try {
        await cancelFacebookPagesSelection();
      } catch (error) {
        console.error('Failed to clear Facebook OAuth session:', error);
      } finally {
        router.push('/dashboard/settings/social-media-accounts');
      }
    });
  };

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon
              icon="logos:facebook"
              className="text-2xl"
            />
          </div>
          <h1 className="text-2xl font-semibold">{t('socialAccounts.facebook.selectTitle')}</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            {t('socialAccounts.facebook.selectDescription')}
          </p>
          {selectedPageName && (
            <span className="text-sm text-primary">
              {t('socialAccounts.facebook.selectedLabel', { page: selectedPageName })}
            </span>
          )}
        </div>

        {pages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-background/60 p-8 text-center">
            <Icon
              icon="solar:face-sad-linear"
              className="mx-auto mb-4 text-3xl text-muted-foreground"
            />
            <p className="mb-6 text-sm text-muted-foreground">
              {t('socialAccounts.facebook.noPages')}
            </p>
            <Button
              color="primary"
              variant="flat"
              onPress={handleCancel}
              isLoading={isCancelling}
              className="px-6">
              {t('socialAccounts.facebook.goBack')}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-3">
              {pages.map((page) => {
                const isSelected = selectedPageId === page.id;
                return (
                  <button
                    key={page.id}
                    type="button"
                    onClick={() => setSelectedPageId(page.id)}
                    className={`w-full rounded-xl border bg-background p-4 text-left transition hover:shadow-md ${
                      isSelected ? 'border-primary shadow-lg ring-2 ring-primary/30' : 'border-border'
                    }`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-semibold">{page.name}</h2>
                          {page.username && (
                            <span className="text-sm text-muted-foreground">@{page.username}</span>
                          )}
                        </div>
                        {page.category && (
                          <Chip
                            size="sm"
                            variant="flat"
                            className="max-w-fit bg-primary/10 text-xs text-primary">
                            {page.category}
                          </Chip>
                        )}
                        {page.tasks && page.tasks.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {t('socialAccounts.facebook.tasksLabel')}: {page.tasks.join(', ')}
                          </p>
                        )}
                      </div>
                      <Icon
                        icon={isSelected ? 'mingcute:check-circle-fill' : 'mingcute:circle-line'}
                        className={`text-2xl ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button
                variant="flat"
                onPress={handleCancel}
                isDisabled={isPending}
                isLoading={isCancelling}
                className="px-6">
                {t('socialAccounts.facebook.cancel')}
              </Button>
              <Button
                color="primary"
                onPress={handleConfirm}
                isDisabled={isCancelling}
                isLoading={isPending}
                className="px-6">
                {t('socialAccounts.facebook.confirm')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
