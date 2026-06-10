import { createServerFn } from '@tanstack/react-start';
import { setCookie } from '@tanstack/react-start/server';
import { z } from 'zod';

import { LANGUAGE_COOKIE, supportedLocales, type Locales } from './settings';

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
const ONE_YEAR_MS = ONE_YEAR_SECONDS * 1000;

const switchLocaleSchema = z.object({
  locale: z.enum(supportedLocales),
});

export const switchLocale = createServerFn({ method: 'POST' })
  .validator(switchLocaleSchema)
  .handler(({ data }) => {
    setCookie(LANGUAGE_COOKIE, data.locale, {
      path: '/',
      maxAge: ONE_YEAR_SECONDS,
      expires: new Date(Date.now() + ONE_YEAR_MS),
      sameSite: 'lax',
    });

    return {
      status: 'success',
      locale: data.locale satisfies Locales,
    };
  });
