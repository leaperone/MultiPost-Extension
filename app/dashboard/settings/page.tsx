'use client';

import { Card, CardBody, CardHeader, Divider } from '@heroui/react';
import { useSession } from 'next-auth/react';
import { useTranslation } from '@/i18n/client';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function SettingsPage() {
  const { data: session } = useSession();
  const { t } = useTranslation('settings');

  if (!session?.user) {
    return null;
  }

  return (
    <div className="mx-auto h-full max-w-3xl space-y-6 overflow-y-auto p-4">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

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
    </div>
  );
}
