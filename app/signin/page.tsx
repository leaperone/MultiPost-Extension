import React from 'react';
import { signIn } from '@/auth';
import { Button, Spacer } from '@heroui/react';
import { Icon } from '@iconify/react/dist/iconify.js';
// import { MailIcon } from 'lucide-react';

const SigninPage = async ({ searchParams }: { searchParams: { redirect: string } }) => {
  const redirect = searchParams.redirect || '/dashboard';

  return (
    <div className="flex min-h-[40px] flex-col items-center gap-2 pb-2">
      <h1 className="text-xl font-medium">Sign In</h1>
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
          Sign in with Github
        </Button>
      </form>
    </div>
  );
};

export default SigninPage;
