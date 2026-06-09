import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Input,
  Tooltip,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { Link, createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import {
  AlertCircle,
  Gift,
  GiftIcon,
  HomeIcon,
  Share2Icon,
  SparklesIcon,
} from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { useTranslation } from '../i18n/client';
import { authClient, useSession } from '../lib/auth-client';
import { routeMeta } from '../lib/seo';
import {
  trackEmailVerificationClicked,
  trackEmailVerificationSent,
  trackSigninFailed,
  trackSigninMethodClicked,
  trackSigninStarted,
  type SigninMethod,
} from '@/lib/posthog/events';

type SigninSearch = {
  redirect?: string;
  error?: string;
  token?: string;
  callbackUrl?: string;
  callbackURL?: string;
};

type SocialProvider = 'github' | 'google';

const errorToI18nKey = {
  OAuthAccountNotLinked: 'error.account_not_linked',
} as const;

type KnownSignInError = keyof typeof errorToI18nKey;

const DEFAULT_CALLBACK_URL = '/dashboard';

export const Route = createFileRoute('/signin')({
  validateSearch: (search): SigninSearch => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
    error: typeof search.error === 'string' ? search.error : undefined,
    token: typeof search.token === 'string' ? search.token : undefined,
    callbackUrl: typeof search.callbackUrl === 'string' ? search.callbackUrl : undefined,
    callbackURL: typeof search.callbackURL === 'string' ? search.callbackURL : undefined,
  }),
  beforeLoad: ({ search }) => {
    const error = typeof search.error === 'string' ? search.error : undefined;

    if (error && !isKnownSignInError(error)) {
      throw redirect({
        to: '/auth/error',
        search: { error },
        statusCode: 302,
      });
    }
  },
  head: () => ({
    meta: routeMeta({
      title: 'Sign In to MultiPost - Free Account Registration',
      description:
        'Sign in to MultiPost with GitHub, Google, or email. Get free credits on signup and start publishing to multiple social media platforms with one click.',
      robots: 'noindex, nofollow',
    }),
  }),
  component: SigninPage,
});

function getCallbackURL(search: SigninSearch) {
  return search.redirect || search.callbackUrl || search.callbackURL || DEFAULT_CALLBACK_URL;
}

function SigninPage() {
  const search = Route.useSearch();
  const callbackURL = getCallbackURL(search);
  const { t } = useTranslation('auth');
  const { status } = useSession();
  const navigate = useNavigate();
  const buttonClasses = 'bg-foreground/10 dark:bg-foreground/20';

  useEffect(() => {
    if (status !== 'authenticated') {
      return;
    }

    void navigate({ href: callbackURL });
  }, [callbackURL, navigate, status]);

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-gradient-to-br from-rose-400 via-fuchsia-500 to-indigo-500 p-2 dark:from-rose-900 dark:via-fuchsia-900 dark:to-indigo-900 sm:p-4 lg:p-8">
      <SigninAnalytics />
      <div className="flex w-full max-w-sm flex-col gap-4 lg:grid lg:max-w-5xl lg:grid-cols-2 lg:gap-6">
        <div className="hidden lg:flex lg:flex-col lg:justify-center">
          <SigninBenefits />
        </div>

        <div className="flex flex-col gap-4">
          <Alert
            color="primary"
            variant="flat"
            icon={<Gift className="size-4" />}>
            {t('signin.github_bonus')}
          </Alert>

          <div className="flex w-full flex-col gap-4 rounded-large bg-background/60 px-8 pb-10 pt-6 shadow-xsall backdrop-blur-md backdrop-saturate-150 dark:bg-default-100/50">
            <div className="flex min-h-[40px] flex-col items-center gap-4">
              <h1 className="text-xl font-medium">{t('signin.title')}</h1>

              {search.error && isKnownSignInError(search.error) && (
                <Card className="mb-4 w-full max-w-md border-red-200">
                  <CardBody className="p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle
                        className="mt-0.5 shrink-0 text-red-500"
                        size={24}
                      />
                      <div className="text-left text-red-500">
                        {t(errorToI18nKey[search.error])}
                      </div>
                    </div>
                  </CardBody>
                </Card>
              )}

              <SocialSigninButton
                provider="github"
                callbackURL={callbackURL}
                icon="logos:github-icon">
                {t('signin.github')}
                <span className="ml-2 rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-600 dark:text-green-400">
                  {t('signin.bonus')}
                </span>
              </SocialSigninButton>

              <SocialSigninButton
                provider="google"
                callbackURL={callbackURL}
                icon="logos:google-icon">
                {t('signin.google')}
              </SocialSigninButton>

              <div className="w-full max-w-md">
                <PasskeyAuthButton callbackURL={callbackURL} />
              </div>

              <Divider />

              <MagicLinkSigninForm callbackURL={callbackURL} />

              {import.meta.env.DEV && (
                <>
                  <Divider />
                  <DevSigninForm callbackURL={callbackURL} />
                </>
              )}
            </div>
          </div>

          <div className="lg:hidden">
            <SigninBenefits />
          </div>

          <div className="flex w-full flex-row justify-between gap-4 rounded-large bg-background/60 px-8 py-4 shadow-xsall backdrop-blur-md backdrop-saturate-150 dark:bg-default-100/50">
            <Link to="/">
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
  );
}

function SocialSigninButton({
  provider,
  callbackURL,
  icon,
  children,
}: {
  provider: SocialProvider;
  callbackURL: string;
  icon: string;
  children: ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(false);

  async function handlePress() {
    if (isLoading) {
      return;
    }

    trackSigninMethodClicked(provider);
    trackSigninStarted(provider);
    setIsLoading(true);

    try {
      const result = await authClient.signIn.social({ provider, callbackURL });

      if (result.error) {
        trackSigninFailed(provider, result.error.message);
        setIsLoading(false);
      }
    } catch (error) {
      trackSigninFailed(provider, error instanceof Error ? error.message : undefined);
      setIsLoading(false);
    }
  }

  return (
    <Button
      data-signin-method={provider}
      onPress={handlePress}
      className="w-full max-w-md"
      isLoading={isLoading}
      startContent={
        !isLoading && (
          <Icon
            icon={icon}
            className="size-6"
          />
        )
      }>
      {children}
    </Button>
  );
}

function PasskeyAuthButton({ callbackURL }: { callbackURL: string }) {
  const { status } = useSession();
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isWebAuthnSupported, setIsWebAuthnSupported] = useState(true);

  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      window.PublicKeyCredential !== undefined &&
      typeof window.PublicKeyCredential === 'function';
    setIsWebAuthnSupported(supported);
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      void navigate({ href: callbackURL });
    }
  }, [callbackURL, navigate, status]);

  async function handlePasskeyAuth() {
    if (!isWebAuthnSupported || isLoading) {
      return;
    }

    trackSigninMethodClicked('passkey');
    trackSigninStarted('passkey');
    setIsLoading(true);

    try {
      const result = await authClient.signIn.passkey();

      if (result.error) {
        trackSigninFailed('passkey', result.error.message);
        setIsLoading(false);
        return;
      }

      await navigate({ href: callbackURL });
    } catch (error) {
      trackSigninFailed('passkey', error instanceof Error ? error.message : undefined);
      setIsLoading(false);
    }
  }

  if (status === 'loading') {
    return null;
  }

  const button = (
    <Button
      data-signin-method="passkey"
      onPress={handlePasskeyAuth}
      className="w-full"
      isLoading={isLoading}
      isDisabled={!isWebAuthnSupported}
      startContent={
        !isLoading && (
          <Icon
            icon="lucide:key"
            className="size-6"
          />
        )
      }>
      {t('signin.passkey')}
    </Button>
  );

  if (!isWebAuthnSupported) {
    return (
      <Tooltip
        content={t('signin.passkey_not_supported')}
        placement="bottom">
        <div className="w-full">{button}</div>
      </Tooltip>
    );
  }

  return button;
}

function MagicLinkSigninForm({ callbackURL }: { callbackURL: string }) {
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) {
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      return;
    }

    trackSigninStarted('email');
    setIsLoading(true);
    setSentEmail(null);
    setError(null);

    try {
      const result = await authClient.signIn.magicLink({
        email: trimmedEmail,
        callbackURL,
      });

      if (result.error) {
        setError(result.error.message || t('error.default'));
        trackSigninFailed('email', result.error.message);
        return;
      }

      setSentEmail(trimmedEmail);
      trackEmailVerificationSent();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error.default');
      setError(message);
      trackSigninFailed('email', message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form
      data-signin-method="email"
      onSubmit={handleSubmit}
      className="w-full max-w-md">
      <div className="flex flex-col gap-2">
        <Input
          type="email"
          name="email"
          placeholder={t('signin.email_placeholder')}
          required
          autoFocus
          className="bg-transparent"
          value={email}
          onValueChange={setEmail}
        />
        <SubmitButton
          icon="lucide:mail"
          isLoading={isLoading}>
          {t('signin.email')}
        </SubmitButton>
        {sentEmail && (
          <p className="rounded-lg bg-success/10 p-3 text-sm text-success-600 dark:text-success-400">
            Check your email: {sentEmail}
          </p>
        )}
        {error && (
          <p className="rounded-lg bg-danger/10 p-3 text-sm text-danger-600 dark:text-danger-400">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}

function DevSigninForm({ callbackURL }: { callbackURL: string }) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) {
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      return;
    }

    trackSigninStarted('http-email');
    setIsLoading(true);
    setMessage(null);
    setError(null);

    try {
      const result = await authClient.signIn.magicLink({
        email: trimmedEmail,
        callbackURL,
      });

      if (result.error) {
        setError(result.error.message || 'Magic link failed');
        trackSigninFailed('http-email', result.error.message);
        return;
      }

      setMessage('Magic link sent. In development, the URL is logged by the auth server.');
      trackEmailVerificationSent();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Magic link failed';
      setError(errorMessage);
      trackSigninFailed('http-email', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <form
        data-signin-method="http-email"
        onSubmit={handleSubmit}
        className="flex w-full flex-row gap-2">
        <Input
          type="email"
          name="email"
          placeholder="Email"
          value={email}
          onValueChange={setEmail}
        />
        <Button
          type="submit"
          isLoading={isLoading}>
          Dev In
        </Button>
      </form>
      {message && (
        <p className="rounded-lg bg-foreground/5 p-3 text-sm text-foreground/70">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-lg bg-danger/10 p-3 text-sm text-danger-600 dark:text-danger-400">
          {error}
        </p>
      )}
    </div>
  );
}

function SubmitButton({
  children,
  icon,
  isLoading,
  className = 'w-full',
}: {
  children: ReactNode;
  icon?: string;
  isLoading: boolean;
  className?: string;
}) {
  return (
    <Button
      type="submit"
      className={className}
      isLoading={isLoading}
      startContent={
        !isLoading &&
        icon && (
          <Icon
            icon={icon}
            className="size-6"
          />
        )
      }>
      {children}
    </Button>
  );
}

function SigninBenefits() {
  const { t } = useTranslation('auth');

  const benefits = [
    {
      icon: <Share2Icon className="size-5" />,
      title: t('signin.benefits.features.multiplatform.title'),
      description: t('signin.benefits.features.multiplatform.description'),
    },
    {
      icon: <SparklesIcon className="size-5" />,
      title: t('signin.benefits.features.ai_creation.title'),
      description: t('signin.benefits.features.ai_creation.description'),
    },
    {
      icon: <GiftIcon className="size-5" />,
      title: t('signin.benefits.features.free_trial.title'),
      description: t('signin.benefits.features.free_trial.description'),
    },
  ];

  return (
    <Card className="border-none bg-background/60 shadow-xsall backdrop-blur-md backdrop-saturate-150 dark:bg-default-100/50">
      <CardHeader className="flex-col items-start pb-4">
        <h2 className="text-lg font-bold text-foreground">
          {t('signin.benefits.title')}
        </h2>
        <p className="text-xs text-muted-foreground">
          {t('signin.benefits.subtitle')}
        </p>
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        {benefits.map((benefit) => (
          <BenefitItem
            key={benefit.title}
            {...benefit}
          />
        ))}
      </CardBody>
    </Card>
  );
}

function BenefitItem({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-foreground/10">
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function SigninAnalytics() {
  const search = Route.useSearch();

  useEffect(() => {
    const handleFormSubmit = (event: Event) => {
      const form = event.target as HTMLFormElement;
      const method = form.dataset.signinMethod;

      if (isSigninMethod(method)) {
        trackSigninMethodClicked(method);
      }
    };

    document.addEventListener('submit', handleFormSubmit);

    return () => {
      document.removeEventListener('submit', handleFormSubmit);
    };
  }, []);

  useEffect(() => {
    if (search.token && (search.callbackUrl || search.callbackURL)) {
      trackEmailVerificationClicked('email_link');
    }
  }, [search.callbackURL, search.callbackUrl, search.token]);

  return null;
}

function isSigninMethod(method: unknown): method is SigninMethod {
  return (
    method === 'github' ||
    method === 'google' ||
    method === 'passkey' ||
    method === 'email' ||
    method === 'http-email'
  );
}

function isKnownSignInError(error: string): error is KnownSignInError {
  return error in errorToI18nKey;
}
