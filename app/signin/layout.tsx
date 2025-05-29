import type { Metadata } from 'next';
import '../globals.css';
import { Providers } from '../providers';
import { Button, Card, CardBody, Chip } from '@heroui/react';
import Link from 'next/link';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { Suspense } from 'react';
import { HomeIcon, Gift } from 'lucide-react';
import { createTranslation } from '@/i18n/server';

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
      <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-rose-400 via-fuchsia-500 to-indigo-500 p-2 dark:from-rose-900 dark:via-fuchsia-900 dark:to-indigo-900 sm:p-4 lg:p-8">
        <div className="flex w-full max-w-sm flex-col gap-4">
          <Card className="w-full max-w-sm border-primary-200 bg-background/80 backdrop-blur-md backdrop-saturate-150 dark:bg-default-100/80">
            <CardBody className="p-4">
              <div className="flex items-center gap-3">
                <Chip
                  color="primary"
                  variant="flat"
                  startContent={<Gift className="size-4" />}
                  className="shrink-0">
                  {t('signin.bonus', '奖励')}
                </Chip>
                <p className="text-sm font-medium text-foreground dark:text-foreground">
                  {t('signin.github_bonus', '使用 GitHub 注册即可获得 1 USD 余额奖励')}
                </p>
              </div>
            </CardBody>
          </Card>
          <div className="flex w-full max-w-sm flex-col gap-4 rounded-large bg-background/60 px-8 pb-10 pt-6 shadow-small backdrop-blur-md backdrop-saturate-150 dark:bg-default-100/50">
            <Suspense>{children}</Suspense>
          </div>
          <div className="flex w-full max-w-sm flex-row justify-between gap-4 rounded-large bg-background/60 px-8 py-4 shadow-small backdrop-blur-md backdrop-saturate-150 dark:bg-default-100/50">
            <Button
              as={Link}
              href="/"
              size="sm"
              isIconOnly
              className={buttonClasses}>
              <HomeIcon />
            </Button>
            <ThemeSwitcher />
          </div>
        </div>
      </div>
    </Providers>
  );
}
