'use client';

import { Button } from '@heroui/react';
import { useSession, signOut } from 'next-auth/react';
import { signIn } from 'next-auth/webauthn';
import { useTranslation } from '@/i18n/client';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { LogOutIcon, User, Settings, Shield } from 'lucide-react';
import {
  LiquidGlassCard,
  LiquidGlassHeader,
  LiquidGlassButton,
} from '@/components/ui/liquid-glass';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { data: session } = useSession();
  const { t } = useTranslation('settings');

  if (!session?.user) {
    return null;
  }

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header Section */}
      <LiquidGlassHeader
        title={t('general.page.title')}
        description={t('general.page.description')}
        action={
          <LiquidGlassButton
            variant="default"
            onClick={() => signOut()}
            className="text-red-500 hover:text-red-400">
            <LogOutIcon className="mr-2 size-4" />
            {t('general.page.logout')}
          </LiquidGlassButton>
        }
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {/* Profile Section */}
        <LiquidGlassCard className="p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-blue-500/20">
              <User className="size-5 text-blue-500 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-foreground/90">{t('profile.title')}</h2>
          </div>
          <div className="space-y-3">
            <div className={cn('rounded-xl p-4', 'bg-white/10 dark:bg-black/20')}>
              <label className="text-sm font-medium text-foreground/60">{t('profile.name')}</label>
              <p className="mt-1 text-lg font-medium text-foreground/90">{session.user.name}</p>
            </div>
            <div className={cn('rounded-xl p-4', 'bg-white/10 dark:bg-black/20')}>
              <label className="text-sm font-medium text-foreground/60">{t('profile.email')}</label>
              <p className="mt-1 text-lg font-medium text-foreground/90">{session.user.email}</p>
            </div>
          </div>
        </LiquidGlassCard>

        {/* Preferences Section */}
        <LiquidGlassCard className="p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-purple-500/20">
              <Settings className="size-5 text-purple-500 dark:text-purple-400" />
            </div>
            <h2 className="text-xl font-semibold text-foreground/90">{t('preferences.title')}</h2>
          </div>
          <div className="space-y-4">
            <div className={cn('rounded-xl p-4', 'bg-white/10 dark:bg-black/20')}>
              <label className="mb-3 block text-sm font-medium text-foreground/60">
                {t('preferences.theme.title')}
              </label>
              <ThemeSwitcher />
            </div>
            <div className={cn('rounded-xl p-4', 'bg-white/10 dark:bg-black/20')}>
              <label className="mb-3 block text-sm font-medium text-foreground/60">{t('preferences.language')}</label>
              <div className="w-full max-w-xs">
                <LanguageSwitcher />
              </div>
            </div>
          </div>
        </LiquidGlassCard>

        {/* Security Section */}
        <LiquidGlassCard className="p-6 lg:col-span-2 xl:col-span-1">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-amber-500/20">
              <Shield className="size-5 text-amber-500 dark:text-amber-400" />
            </div>
            <h2 className="text-xl font-semibold text-foreground/90">{t('security.title')}</h2>
          </div>
          <div className={cn('rounded-xl p-4', 'bg-white/10 dark:bg-black/20')}>
            <div className="mb-4">
              <h3 className="mb-2 text-sm font-medium text-foreground/80">{t('security.passkey.title')}</h3>
              <p className="text-sm leading-relaxed text-foreground/60">{t('security.passkey.description')}</p>
            </div>
            <LiquidGlassButton
              variant="primary"
              size="sm"
              onClick={() => signIn('passkey', { action: 'register' })}>
              {t('security.passkey.register')}
            </LiquidGlassButton>
          </div>
        </LiquidGlassCard>
      </div>

      {/* Additional Settings Section */}
      <div className="mt-8">
        <LiquidGlassCard className="p-6">
          <h2 className="mb-6 text-xl font-semibold text-foreground/90">{t('general.advanced.title')}</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className={cn('rounded-xl p-4 text-center', 'bg-white/10 dark:bg-black/20')}>
              <h3 className="mb-2 font-medium text-foreground/90">{t('general.advanced.data_export.title')}</h3>
              <p className="mb-3 text-sm text-foreground/60">{t('general.advanced.data_export.description')}</p>
              <Button
                size="sm"
                variant="flat"
                isDisabled
                className="border border-white/20 bg-white/10 shadow-none dark:border-white/10">
                {t('general.advanced.data_export.button')}
              </Button>
            </div>
            <div className={cn('rounded-xl p-4 text-center', 'bg-white/10 dark:bg-black/20')}>
              <h3 className="mb-2 font-medium text-foreground/90">{t('general.advanced.account_deletion.title')}</h3>
              <p className="mb-3 text-sm text-foreground/60">{t('general.advanced.account_deletion.description')}</p>
              <Button
                size="sm"
                color="danger"
                variant="flat"
                isDisabled
                className="shadow-none">
                {t('general.advanced.account_deletion.button')}
              </Button>
            </div>
            <div className={cn('rounded-xl p-4 text-center', 'bg-white/10 dark:bg-black/20')}>
              <h3 className="mb-2 font-medium text-foreground/90">{t('general.advanced.privacy_settings.title')}</h3>
              <p className="mb-3 text-sm text-foreground/60">{t('general.advanced.privacy_settings.description')}</p>
              <Button
                size="sm"
                variant="flat"
                isDisabled
                className="border border-white/20 bg-white/10 shadow-none dark:border-white/10">
                {t('general.advanced.privacy_settings.button')}
              </Button>
            </div>
          </div>
        </LiquidGlassCard>
      </div>
    </div>
  );
}
