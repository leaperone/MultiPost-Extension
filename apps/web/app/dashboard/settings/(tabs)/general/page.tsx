'use client';

import { Card, Button } from '@heroui/react';
import { useSession, signOut } from 'next-auth/react';
import { signIn } from 'next-auth/webauthn';
import { useTranslation } from '@/i18n/client';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { LogOutIcon, User, Settings, Shield } from 'lucide-react';

export default function SettingsPage() {
  const { data: session } = useSession();
  const { t } = useTranslation('settings');

  if (!session?.user) {
    return null;
  }

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header Section */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('general.page.title')}</h1>
          <p className="text-muted-foreground">{t('general.page.description')}</p>
        </div>
        <Button
          variant="bordered"
          onPress={() => signOut()}
          className="text-red-500 hover:text-red-400">
          <LogOutIcon className="mr-2 size-4" />
          {t('general.page.logout')}
        </Button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {/* Profile Section */}
        <Card className="shadow-none border p-6">
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

        {/* Preferences Section */}
        <Card className="shadow-none border p-6">
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
              <label className="mb-3 block text-sm font-medium text-muted-foreground">{t('preferences.language')}</label>
              <div className="w-full max-w-xs">
                <LanguageSwitcher />
              </div>
            </div>
          </div>
        </Card>

        {/* Security Section */}
        <Card className="shadow-none border p-6 lg:col-span-2 xl:col-span-1">
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
              onPress={() => signIn('passkey', { action: 'register' })}>
              {t('security.passkey.register')}
            </Button>
          </div>
        </Card>
      </div>

      {/* Additional Settings Section */}
      <div className="mt-8">
        <Card className="shadow-none border p-6">
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
              <h3 className="mb-2 font-medium text-foreground">{t('general.advanced.account_deletion.title')}</h3>
              <p className="mb-3 text-sm text-muted-foreground">{t('general.advanced.account_deletion.description')}</p>
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
              <p className="mb-3 text-sm text-muted-foreground">{t('general.advanced.privacy_settings.description')}</p>
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
