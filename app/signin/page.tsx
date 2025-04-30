import React from 'react';
import { signIn } from '@/auth';
import { Button, Input, Spacer, Card, CardBody } from '@heroui/react';
import { Icon } from '@iconify/react/dist/iconify.js';
import { createTranslation } from '@/i18n/server';
import { PasskeyAuthButton } from './PasskeyAuthButton';
import { AlertCircle } from 'lucide-react';
import { redirect } from 'next/navigation';

// 定义错误类型
enum SignInError {
  OAuthAccountNotLinked = 'OAuthAccountNotLinked',
}

// 错误类型到i18n键值的映射
const errorToI18nKey = {
  [SignInError.OAuthAccountNotLinked]: 'error.account_not_linked',
};

const SigninPage = async (props: { searchParams: Promise<{ redirect?: string; error?: string }> }) => {
  const searchParams = await props.searchParams;
  const redirectTo = searchParams.redirect || '/dashboard';
  const error = searchParams.error;
  const { t } = await createTranslation('auth');

  // 如果错误不在错误映射中，则重定向到错误页面
  if (error && !errorToI18nKey[error as SignInError]) {
    redirect(`/auth/error?error=${error}`);
  }

  return (
    <div className="flex min-h-[40px] flex-col items-center gap-2 pb-2">
      <h1 className="text-xl font-medium">{t('signin.title')}</h1>
      <Spacer y={4} />

      {error && errorToI18nKey[error as SignInError] && (
        <Card className="mb-4 w-full max-w-md border-red-200">
          <CardBody className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle
                className="mt-0.5 shrink-0 text-red-500"
                size={24}
              />
              <div className="text-left text-red-500">{t(errorToI18nKey[error as SignInError])}</div>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="relative w-full max-w-md">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-gray-200 dark:border-gray-800" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-transparent px-4 text-muted-foreground/60">{t('signin.or')}</span>
        </div>
      </div>
      <Spacer y={2} />
      <form
        action={async () => {
          'use server';
          await signIn('google', { redirectTo });
        }}
        className="w-full max-w-md">
        <Button
          type="submit"
          className="w-full"
          startContent={
            <Icon
              icon="logos:google-icon"
              className="size-6"
            />
          }>
          {t('signin.google')}
        </Button>
      </form>
      <Spacer y={2} />
      <form
        action={async () => {
          'use server';
          await signIn('github', { redirectTo });
        }}
        className="w-full max-w-md">
        <Button
          type="submit"
          className="w-full"
          startContent={
            <Icon
              icon="logos:github-icon"
              className="size-6"
            />
          }>
          {t('signin.github')}
        </Button>
      </form>
      <Spacer y={2} />
      <div className="w-full max-w-md">
        <PasskeyAuthButton redirect={redirectTo} />
      </div>
      <Spacer y={2} />

      <form
        action={async (formData: FormData) => {
          'use server';
          await signIn('mailgun', {
            email: formData.get('email'),
            redirectTo,
          });
        }}
        className="w-full max-w-md">
        <div className="flex flex-col gap-2">
          <Input
            type="email"
            name="email"
            placeholder={t('signin.email_placeholder')}
            required
            className="bg-transparent"
          />
          <Button
            type="submit"
            className="w-full">
            {t('signin.email')}
          </Button>
        </div>
      </form>

      {process.env.NODE_ENV === 'development' && (
        <>
          <Spacer y={2} />
          <form
            action={async (formData: FormData) => {
              'use server';
              await signIn('http-email', {
                email: formData.get('email'),
                redirectTo,
              });
            }}>
            <Input
              type="email"
              name="email"
              placeholder="Email"
            />
            <Button type="submit">Sign in with Email</Button>
          </form>
        </>
      )}
    </div>
  );
};

export default SigninPage;
