'use client';
import { Card, CardBody, CardHeader, Divider, Button } from '@heroui/react';
import { useSession, signOut } from 'next-auth/react';
import { signIn } from 'next-auth/webauthn';
import { useTranslation } from '@/i18n/client';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { LogOutIcon } from 'lucide-react';

export default function SettingsPage() {
  const { data: session } = useSession();
  const { t } = useTranslation('settings');

  if (!session?.user) {
    return null;
  }

  return (
    <div className="mx-auto h-full max-w-3xl space-y-6 overflow-y-auto p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Button
          isIconOnly
          color="danger"
          variant="flat"
          aria-label="Sign out"
          onPress={() => signOut()}>
          <LogOutIcon />
        </Button>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">{t('profile.title')}</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div>
            <label className="text-sm text-foreground/60">{t('profile.name')}</label>
            <p className="text-foreground">{session.user.name}</p>
          </div>
          <div>
            <label className="text-sm text-foreground/60">{t('profile.email')}</label>
            <p className="text-foreground">{session.user.email}</p>
          </div>
        </CardBody>
      </Card>

      {/* Preferences Section */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">{t('preferences.title')}</h2>
        </CardHeader>
        <CardBody className="space-y-6">
          <div>
            <label className="mb-2 block text-sm text-foreground/60">{t('preferences.theme.title')}</label>
            <ThemeSwitcher />
          </div>
          <Divider />
          <div>
            <label className="mb-2 block text-sm text-foreground/60">{t('preferences.language')}</label>
            <div className="w-48">
              <LanguageSwitcher />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Security Section */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">{t('security.title')}</h2>
        </CardHeader>
        <CardBody className="space-y-6">
          <div>
            <label className="mb-2 block text-sm text-foreground/60">{t('security.passkey.title')}</label>
            <p className="mb-4 text-sm text-foreground/60">{t('security.passkey.description')}</p>
            <button
              onClick={() => signIn('passkey', { action: 'register' })}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">
              {t('security.passkey.register')}
            </button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
