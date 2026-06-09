import { Button } from '@heroui/react';
import { Link, useNavigate } from '@tanstack/react-router';

import { signOut, useSession } from '../lib/auth-client';
import { useTranslation } from '../i18n/client';

const SignInButton = () => {
  const session = useSession();
  const { t } = useTranslation('auth');
  const navigate = useNavigate();

  if (session.data?.user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          className="hidden items-center space-x-2 rounded-full bg-default-100 px-2 py-1 transition-colors hover:bg-default-200 sm:flex"
          to={'/dashboard' as never}>
          <p className="max-w-24 truncate text-small font-medium text-foreground">
            {session.data.user.name}
          </p>
        </Link>
        <Button
          size="sm"
          variant="flat"
          onPress={async () => {
            await signOut();
            await navigate({ href: '/' });
          }}>
          {t('signout.confirm')}
        </Button>
      </div>
    );
  }

  return (
    <Link to={'/signin' as never}>
      <Button>{t('signin.button')}</Button>
    </Link>
  );
};

export default SignInButton;
