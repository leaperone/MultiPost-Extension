import { Button, Card, CardBody, CardHeader } from '@heroui/react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { useTranslation } from '../i18n/client';
import { signOut } from '../lib/auth-client';
import { routeMeta } from '../lib/seo';

export const Route = createFileRoute('/signout')({
  head: () => ({
    meta: routeMeta({
      title: 'Signout | MultiPost',
      description: 'Signout from MultiPost',
    }),
  }),
  component: SignoutPage,
});

function SignoutPage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    await signOut();
    await navigate({ href: '/' });
  };

  useEffect(() => {
    void handleSignOut();
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col items-center pb-0">
          <h2 className="text-2xl font-bold">{t('signout.title')}</h2>
        </CardHeader>
        <CardBody>
          <Button
            color="primary"
            fullWidth
            isLoading={isSigningOut}
            onPress={handleSignOut}>
            {t('signout.confirm')}
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
