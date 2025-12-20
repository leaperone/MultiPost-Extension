'use client';

import { Button, Link } from "@heroui/react";
import { useSession } from 'next-auth/react';
import { useTranslation } from '@/i18n/client';

const SignInButton = () => {
  const session = useSession();
  const { t } = useTranslation('auth');

  if (session.data?.user) {
    return <UserInfoDisplay />;
  }

  return (
    <Button
      as={Link}
      href="/signin">
      {t('signin.button')}
    </Button>
  );
};

const UserInfoDisplay = () => {
  const session = useSession();
  return (
    <Link
      className="flex items-center space-x-2 rounded-full bg-default-100 px-2 py-1 transition-colors hover:bg-default-200"
      href="/dashboard">
      <p className="text-small font-medium text-foreground">{session.data?.user?.name}</p>
    </Link>
  );
};

export default SignInButton;
