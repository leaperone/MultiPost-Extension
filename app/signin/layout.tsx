import type { Metadata } from 'next';
import '../globals.css';
import { Providers } from '../providers';
import { Button } from '@heroui/react';
import Link from 'next/link';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { Suspense } from 'react';
import { HomeIcon } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Sign In | MultiPost',
  description: 'MultiPost Sign In',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const buttonClasses = 'bg-foreground/10 dark:bg-foreground/20';

  return (
    <Providers>
      <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-rose-400 via-fuchsia-500 to-indigo-500 p-2 dark:from-rose-900 dark:via-fuchsia-900 dark:to-indigo-900 sm:p-4 lg:p-8">
        <div className="flex w-full max-w-sm flex-col gap-4">
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
