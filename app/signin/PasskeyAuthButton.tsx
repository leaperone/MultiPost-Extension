'use client';

import { Button } from '@heroui/react';
import { Icon } from '@iconify/react';
import { useSession } from 'next-auth/react';
import { signIn } from 'next-auth/webauthn';
import { useTranslation } from '@/i18n/client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface PasskeyAuthButtonProps {
  redirect: string;
}

export function PasskeyAuthButton({ redirect }: PasskeyAuthButtonProps) {
  const { status } = useSession();
  const { t } = useTranslation('auth');
  const router = useRouter();

  const handlePasskeyAuth = async () => {
    // 使用 passkey 登录
    await signIn('passkey', { redirect: true, redirectTo: redirect });
  };

  useEffect(() => {
    if (status === 'authenticated') {
      router.push(redirect);
    }
  }, [status]);

  if (status === 'loading') return null;

  return (
    <Button
      onPress={handlePasskeyAuth}
      className="w-full"
      startContent={
        <Icon
          icon="lucide:key"
          className="size-6"
        />
      }>
      {t('signin.passkey')}
    </Button>
  );
}
