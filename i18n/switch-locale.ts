'use server';

import {cookies} from 'next/headers';
import {LANGUAGE_COOKIE} from '../i18n/settings';

export async function switchLocaleAction(value: string) {
  (await cookies()).set(LANGUAGE_COOKIE, value);

  // It does not matter what we return here
  return {
    status: 'success',
  };
}
