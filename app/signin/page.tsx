import React, { Suspense } from 'react';
import { signIn } from '@/auth';
import { Button, Input, Card, CardBody, Divider } from '@heroui/react';
import { createTranslation } from '@/i18n/server';
import { PasskeyAuthButton } from './PasskeyAuthButton';
import { SubmitButton } from './SubmitButton';
import { SigninAnalytics } from './SigninAnalytics';
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
    <div className="flex min-h-[40px] flex-col items-center gap-4">
      <Suspense fallback={null}>
        <SigninAnalytics />
      </Suspense>
      <h1 className="text-xl font-medium">{t('signin.title')}</h1>

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

      <form
        data-signin-method="github"
        action={async () => {
          'use server';
          await signIn('github', { redirectTo });
        }}
        className="w-full max-w-md">
        <SubmitButton icon="logos:github-icon">
          {t('signin.github')}
          <span className="ml-2 rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-600 dark:text-green-400">
            {t('signin.bonus')}
          </span>
        </SubmitButton>
      </form>
      <form
        data-signin-method="google"
        action={async () => {
          'use server';
          await signIn('google', { redirectTo });
        }}
        className="w-full max-w-md">
        <SubmitButton icon="logos:google-icon">{t('signin.google')}</SubmitButton>
      </form>
      <div className="w-full max-w-md">
        <PasskeyAuthButton redirect={redirectTo} />
      </div>

      <Divider />

      <form
        data-signin-method="email"
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
            autoFocus
            className="bg-transparent"
          />
          <SubmitButton icon="lucide:mail">{t('signin.email')}</SubmitButton>
        </div>
      </form>

      {process.env.NODE_ENV === 'development' && (
        <>
          <Divider />
          <form
            data-signin-method="http-email"
            action={async (formData: FormData) => {
              'use server';
              await signIn('http-email', {
                email: formData.get('email'),
                redirectTo,
              });
            }}
            className="flex w-full flex-row gap-2">
            <Input
              type="email"
              name="email"
              placeholder="Email"
            />
            <Button type="submit">Dev In</Button>
          </form>
        </>
      )}
    </div>
  );
};

export default SigninPage;
