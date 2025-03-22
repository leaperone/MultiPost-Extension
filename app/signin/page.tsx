import React from 'react';
import { signIn } from '@/auth';
import { Button, Spacer } from '@heroui/react';
import { Icon } from '@iconify/react/dist/iconify.js';
import { createTranslation } from '@/i18n/server';
// import { MailIcon } from 'lucide-react';

const SigninPage = async (props: { searchParams: Promise<{ redirect: string }> }) => {
  const searchParams = await props.searchParams;
  const redirect = searchParams.redirect || '/dashboard';
  const { t } = await createTranslation('auth');

  return (
    <div className="flex min-h-[40px] flex-col items-center gap-2 pb-2">
      <h1 className="text-xl font-medium">{t('signin.title')}</h1>
      <Spacer y={4} />

      <form
        action={async () => {
          'use server';
          await signIn('github', { redirectTo: redirect });
        }}>
        <Button
          type="submit"
          className="w-full bg-foreground/10 dark:bg-foreground/20"
          startContent={
            <Icon
              icon="logos:github-icon"
              className="size-6"
            />
          }>
          {t('signin.github')}
        </Button>
      </form>
    </div>
  );
};

export default SigninPage;
