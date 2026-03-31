'use server';

import { cookies } from 'next/headers';
import { LANGUAGE_COOKIE } from '../i18n/settings';

export async function switchLocaleAction(value: string) {
  (await cookies()).set(LANGUAGE_COOKIE, value, {
    expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
  });

  // It does not matter what we return here
  return {
    status: 'success',
  };
}
