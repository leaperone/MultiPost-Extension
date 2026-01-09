import type { Metadata } from 'next';
import '../globals.css';
import { Providers } from '../providers';
import { Alert, Button } from '@heroui/react';
import Link from 'next/link';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { Suspense } from 'react';
import { HomeIcon, Gift } from 'lucide-react';
import { createTranslation } from '@/i18n/server';
import { SigninBenefits } from './SigninBenefits';

export const metadata: Metadata = {
  title: 'Sign In | MultiPost',
  description: 'MultiPost Sign In',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const buttonClasses = 'bg-foreground/10 dark:bg-foreground/20';
  const { t } = await createTranslation('auth');

  return (
    <Providers>
      <div className="flex min-h-screen w-screen items-center justify-center bg-gradient-to-br from-rose-400 via-fuchsia-500 to-indigo-500 p-2 dark:from-rose-900 dark:via-fuchsia-900 dark:to-indigo-900 sm:p-4 lg:p-8">
        {/* 响应式容器：移动端垂直，桌面端水平 */}
        <div className="flex w-full max-w-sm flex-col gap-4 lg:grid lg:max-w-5xl lg:grid-cols-2 lg:gap-6">
          {/* 左侧：产品价值介绍（桌面端显示） */}
          <div className="hidden lg:flex lg:flex-col lg:justify-center">
            <SigninBenefits />
          </div>

          {/* 右侧：登录表单 */}
          <div className="flex flex-col gap-4">
            <Alert
              color="primary"
              variant="flat"
              icon={<Gift className="size-4" />}>
              {t('signin.github_bonus')}
            </Alert>

            <div className="flex w-full flex-col gap-4 rounded-large bg-background/60 px-8 pb-10 pt-6 shadow-xsall backdrop-blur-md backdrop-saturate-150 dark:bg-default-100/50">
              <Suspense>{children}</Suspense>
            </div>

            {/* 移动端显示产品价值介绍（放在登录表单下方） */}
            <div className="lg:hidden">
              <SigninBenefits />
            </div>

            <div className="flex w-full flex-row justify-between gap-4 rounded-large bg-background/60 px-8 py-4 shadow-xsall backdrop-blur-md backdrop-saturate-150 dark:bg-default-100/50">
              <Link href="/">
                <Button
                  size="sm"
                  isIconOnly
                  className={buttonClasses}>
                  <HomeIcon />
                </Button>
              </Link>
              <ThemeSwitcher />
            </div>
          </div>
        </div>
      </div>
    </Providers>
  );
}
