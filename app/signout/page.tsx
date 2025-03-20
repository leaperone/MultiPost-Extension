import React from 'react';
import { signOut } from '@/auth';
import { Card, CardHeader, CardBody, Button } from '@heroui/react';
import { createTranslation } from '@/i18n/server';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Signout | MultiPost',
  description: 'Signout from MultiPost',
};

const SignoutPage = async () => {
  const { t } = await createTranslation('auth');

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col items-center pb-0">
          <h2 className="text-2xl font-bold">{t('signout.title')}</h2>
        </CardHeader>
        <CardBody>
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/' });
            }}>
            <Button
              type="submit"
              color="primary"
              fullWidth>
              {t('signout.confirm')}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
};

export default SignoutPage;
