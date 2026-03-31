'use server';

import { signIn } from '@/auth';
import { getLastVerificationUrl } from '@/lib/devauth';
import { isRedirectError } from 'next/dist/client/components/redirect-error';

export async function devSignIn(formData: FormData): Promise<{ url: string | null }> {
  try {
    await signIn('http-email', {
      email: formData.get('email'),
      redirect: false,
    });
  } catch (error) {
    // signIn throws a NEXT_REDIRECT even with redirect: false for email providers
    if (isRedirectError(error)) {
      // expected — token was created and sendVerificationRequest was called
    } else {
      throw error;
    }
  }

  return { url: getLastVerificationUrl() };
}
