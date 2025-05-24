'use client';
import { Card, CardBody, CardHeader, Button } from '@heroui/react';
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
    <div className="size-full overflow-y-auto p-6">
      {/* Header Section */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
          <p className="mt-2 text-foreground/60">管理您的账户设置和偏好</p>
        </div>
        <Button
          color="danger"
          variant="flat"
          startContent={<LogOutIcon size={18} />}
          onPress={() => signOut()}
          className="border border-danger/20 shadow-none">
          退出登录
        </Button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {/* Profile Section */}
        <Card className="border border-default-200 shadow-none transition-colors hover:border-default-300">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <User className="size-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">{t('profile.title')}</h2>
            </div>
          </CardHeader>
          <CardBody className="space-y-4 pt-0">
            <div className="space-y-3">
              <div className="rounded-lg bg-default-50 p-4">
                <label className="text-sm font-medium text-foreground/60">{t('profile.name')}</label>
                <p className="mt-1 text-lg font-medium text-foreground">{session.user.name}</p>
              </div>
              <div className="rounded-lg bg-default-50 p-4">
                <label className="text-sm font-medium text-foreground/60">{t('profile.email')}</label>
                <p className="mt-1 text-lg font-medium text-foreground">{session.user.email}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Preferences Section */}
        <Card className="border border-default-200 shadow-none transition-colors hover:border-default-300">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-secondary/10">
                <Settings className="size-5 text-secondary" />
              </div>
              <h2 className="text-xl font-semibold">{t('preferences.title')}</h2>
            </div>
          </CardHeader>
          <CardBody className="space-y-6 pt-0">
            <div className="space-y-4">
              <div className="rounded-lg bg-default-50 p-4">
                <label className="mb-3 block text-sm font-medium text-foreground/60">
                  {t('preferences.theme.title')}
                </label>
                <ThemeSwitcher />
              </div>
              <div className="rounded-lg bg-default-50 p-4">
                <label className="mb-3 block text-sm font-medium text-foreground/60">{t('preferences.language')}</label>
                <div className="w-full max-w-xs">
                  <LanguageSwitcher />
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Security Section */}
        <Card className="border border-default-200 shadow-none transition-colors hover:border-default-300 lg:col-span-2 xl:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-warning/10">
                <Shield className="size-5 text-warning" />
              </div>
              <h2 className="text-xl font-semibold">{t('security.title')}</h2>
            </div>
          </CardHeader>
          <CardBody className="pt-0">
            <div className="rounded-lg bg-default-50 p-4">
              <div className="mb-4">
                <h3 className="mb-2 text-sm font-medium text-foreground/60">{t('security.passkey.title')}</h3>
                <p className="text-sm leading-relaxed text-foreground/60">{t('security.passkey.description')}</p>
              </div>
              <Button
                color="primary"
                variant="flat"
                onPress={() => signIn('passkey', { action: 'register' })}
                className="border border-primary/20 shadow-none">
                {t('security.passkey.register')}
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Additional Settings Section */}
      <div className="mt-8">
        <Card className="border border-default-200 shadow-none transition-colors hover:border-default-300">
          <CardHeader>
            <h2 className="text-xl font-semibold">高级设置</h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg bg-default-50 p-4 text-center">
                <h3 className="mb-2 font-medium text-foreground">数据导出</h3>
                <p className="mb-3 text-sm text-foreground/60">导出您的账户数据</p>
                <Button
                  size="sm"
                  variant="flat"
                  isDisabled
                  className="border border-default-200 shadow-none">
                  导出数据
                </Button>
              </div>
              <div className="rounded-lg bg-default-50 p-4 text-center">
                <h3 className="mb-2 font-medium text-foreground">账户删除</h3>
                <p className="mb-3 text-sm text-foreground/60">永久删除您的账户</p>
                <Button
                  size="sm"
                  color="danger"
                  variant="flat"
                  isDisabled
                  className="border border-danger/20 shadow-none">
                  删除账户
                </Button>
              </div>
              <div className="rounded-lg bg-default-50 p-4 text-center">
                <h3 className="mb-2 font-medium text-foreground">隐私设置</h3>
                <p className="mb-3 text-sm text-foreground/60">管理隐私偏好</p>
                <Button
                  size="sm"
                  variant="flat"
                  isDisabled
                  className="border border-default-200 shadow-none">
                  隐私设置
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
