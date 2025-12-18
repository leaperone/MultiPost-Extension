'use client';

import { Button, Tooltip } from '@heroui/react';
import { Icon } from '@iconify/react';
import { useSession } from 'next-auth/react';
import { signIn } from 'next-auth/webauthn';
import { useTranslation } from '@/i18n/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface PasskeyAuthButtonProps {
  redirect: string;
}

export function PasskeyAuthButton({ redirect }: PasskeyAuthButtonProps) {
  const { status } = useSession();
  const { t } = useTranslation('auth');
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isWebAuthnSupported, setIsWebAuthnSupported] = useState(true);

  useEffect(() => {
    // Check if WebAuthn is supported
    const checkWebAuthnSupport = () => {
      const supported =
        typeof window !== 'undefined' &&
        window.PublicKeyCredential !== undefined &&
        typeof window.PublicKeyCredential === 'function';
      setIsWebAuthnSupported(supported);
    };
    checkWebAuthnSupport();
  }, []);

  const handlePasskeyAuth = async () => {
    if (!isWebAuthnSupported) return;

    setIsLoading(true);
    try {
      await signIn('passkey', { redirect: true, redirectTo: redirect });
    } catch {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      router.push(redirect);
    }
  }, [status, redirect, router]);

  if (status === 'loading') return null;

  const button = (
    <Button
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
      <Tooltip content={t('signin.passkey_not_supported')} placement="bottom">
        <div className="w-full">{button}</div>
      </Tooltip>
    );
  }

  return button;
}
