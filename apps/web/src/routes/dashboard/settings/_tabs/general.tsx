import { addToast, Button, Card } from '@heroui/react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { LogOutIcon, Settings, Shield, User } from 'lucide-react';
import { useState } from 'react';

import LanguageSwitcher from '../../../../components/LanguageSwitcher';
import { ThemeSwitcher } from '../../../../components/ThemeSwitcher';
import { useTranslation } from '../../../../i18n/client';
import { registerPasskey, signOut, useSession } from '../../../../lib/auth-client';

export const Route = createFileRoute('/dashboard/settings/_tabs/general')({
  component: GeneralSettingsPage,
});

function GeneralSettingsPage() {
  const { data: session } = useSession();
  const { t } = useTranslation('settings');
  const navigate = useNavigate();
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);

  if (!session?.user) {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    await navigate({ to: '/signin' });
  };

  const handleRegisterPasskey = async () => {
    setIsRegisteringPasskey(true);
    try {
      const result = await registerPasskey({
        name: 'MultiPost Passkey',
      });

      if (result.error) {
        addToast({
          title: result.error.message || t('security.passkey.register'),
          color: 'danger',
        });
        return;
      }

      addToast({
        title: t('security.passkey.register'),
        color: 'success',
      });
    } catch (error) {
      addToast({
        title: error instanceof Error ? error.message : t('security.passkey.register'),
        color: 'danger',
      });
    } finally {
      setIsRegisteringPasskey(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('general.page.title')}</h1>
          <p className="text-muted-foreground">{t('general.page.description')}</p>
        </div>
        <Button
          variant="bordered"
          onPress={handleSignOut}
          className="text-red-500 hover:text-red-400">
          <LogOutIcon className="mr-2 size-4" />
          {t('general.page.logout')}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="border p-6 shadow-none">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-default-100">
              <User className="size-5" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">{t('profile.title')}</h2>
          </div>
          <div className="space-y-3">
            <div className="rounded-xl bg-default-50 p-4">
              <label className="text-sm font-medium text-muted-foreground">{t('profile.name')}</label>
              <p className="mt-1 text-lg font-medium text-foreground">{session.user.name}</p>
            </div>
            <div className="rounded-xl bg-default-50 p-4">
              <label className="text-sm font-medium text-muted-foreground">{t('profile.email')}</label>
              <p className="mt-1 text-lg font-medium text-foreground">{session.user.email}</p>
            </div>
          </div>
        </Card>

        <Card className="border p-6 shadow-none">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-default-100">
              <Settings className="size-5" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">{t('preferences.title')}</h2>
          </div>
          <div className="space-y-4">
            <div className="rounded-xl bg-default-50 p-4">
              <label className="mb-3 block text-sm font-medium text-muted-foreground">
                {t('preferences.theme.title')}
              </label>
              <ThemeSwitcher />
            </div>
            <div className="rounded-xl bg-default-50 p-4">
              <label className="mb-3 block text-sm font-medium text-muted-foreground">
                {t('preferences.language')}
              </label>
              <div className="w-full max-w-xs">
                <LanguageSwitcher />
              </div>
            </div>
          </div>
        </Card>

        <Card className="border p-6 shadow-none lg:col-span-2 xl:col-span-1">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-default-100">
              <Shield className="size-5" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">{t('security.title')}</h2>
          </div>
          <div className="rounded-xl bg-default-50 p-4">
            <div className="mb-4">
              <h3 className="mb-2 text-sm font-medium text-foreground">{t('security.passkey.title')}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{t('security.passkey.description')}</p>
            </div>
            <Button
              variant="solid"
              size="sm"
              isLoading={isRegisteringPasskey}
              onPress={handleRegisterPasskey}>
              {t('security.passkey.register')}
            </Button>
          </div>
        </Card>
      </div>

      <div className="mt-8">
        <Card className="border p-6 shadow-none">
          <h2 className="mb-6 text-xl font-semibold text-foreground">{t('general.advanced.title')}</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl bg-default-50 p-4 text-center">
              <h3 className="mb-2 font-medium text-foreground">{t('general.advanced.data_export.title')}</h3>
              <p className="mb-3 text-sm text-muted-foreground">{t('general.advanced.data_export.description')}</p>
              <Button
                size="sm"
                variant="flat"
                isDisabled
                className="shadow-none">
                {t('general.advanced.data_export.button')}
              </Button>
            </div>
            <div className="rounded-xl bg-default-50 p-4 text-center">
              <h3 className="mb-2 font-medium text-foreground">
                {t('general.advanced.account_deletion.title')}
              </h3>
              <p className="mb-3 text-sm text-muted-foreground">
                {t('general.advanced.account_deletion.description')}
              </p>
              <Button
                size="sm"
                color="danger"
                variant="flat"
                isDisabled
                className="shadow-none">
                {t('general.advanced.account_deletion.button')}
              </Button>
            </div>
            <div className="rounded-xl bg-default-50 p-4 text-center">
              <h3 className="mb-2 font-medium text-foreground">{t('general.advanced.privacy_settings.title')}</h3>
              <p className="mb-3 text-sm text-muted-foreground">
                {t('general.advanced.privacy_settings.description')}
              </p>
              <Button
                size="sm"
                variant="flat"
                isDisabled
                className="shadow-none">
                {t('general.advanced.privacy_settings.button')}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
