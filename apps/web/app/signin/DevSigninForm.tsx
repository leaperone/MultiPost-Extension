'use client';

import { useState } from 'react';
import { Button, Input } from '@heroui/react';
import { devSignIn } from './devSigninAction';

export function DevSigninForm() {
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    const result = await devSignIn(formData);
    if (result?.url) {
      setVerifyUrl(result.url);
    }
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <form action={handleSubmit} className="flex w-full flex-row gap-2">
        <Input type="email" name="email" placeholder="Email" />
        <Button type="submit">Dev In</Button>
      </form>
      {verifyUrl && (
        <a
          href={verifyUrl}
          className="break-all rounded-lg bg-foreground/5 p-3 text-sm text-primary underline"
        >
          {verifyUrl}
        </a>
      )}
    </div>
  );
}
