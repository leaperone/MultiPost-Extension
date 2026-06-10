import { getRequestHeaders } from '@tanstack/react-start/server';
import { createInstance } from 'i18next';

import {
  FALLBACK_LOCALE,
  getOptions,
  LANGUAGE_COOKIE,
  supportedLocales,
  type Locales,
} from './settings';
import { loadLocaleResources } from './resources';

async function initI18next(lang: Locales, namespace: string) {
  const locales: Locales[] = lang === FALLBACK_LOCALE ? [lang] : [lang, FALLBACK_LOCALE];
  const bundles = await Promise.all(locales.map(loadLocaleResources));
  const resources = Object.fromEntries(locales.map((locale, index) => [locale, bundles[index]]));

  const i18nInstance = createInstance();
  await i18nInstance.init({
    ...getOptions(lang, namespace),
    resources,
    interpolation: {
      escapeValue: false,
    },
  });

  return i18nInstance;
}

export async function createTranslation(ns: string) {
  const lang = await getLocale();
  const i18nextInstance = await initI18next(lang, ns);

  return {
    t: i18nextInstance.getFixedT(lang, ns),
  };
}

export function resolveLocale(headers: Headers): Locales {
  const cookieLocale = getCookieValue(headers.get('cookie'), LANGUAGE_COOKIE);

  if (cookieLocale && supportedLocales.includes(cookieLocale as Locales)) {
    return cookieLocale as Locales;
  }

  const detectedLocale = parseAcceptLanguage(headers.get('accept-language'));

  return detectedLocale ?? FALLBACK_LOCALE;
}

export async function getLocale(): Promise<Locales> {
  try {
    return resolveLocale(getRequestHeaders());
  } catch {
    return FALLBACK_LOCALE;
  }
}

function getCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;

  for (const cookie of cookieHeader.split(';')) {
    const [rawKey, ...rawValue] = cookie.trim().split('=');
    if (rawKey === name) {
      return decodeURIComponent(rawValue.join('='));
    }
  }

  return null;
}

function parseAcceptLanguage(acceptLanguage: string | null): Locales | null {
  if (!acceptLanguage) return null;

  const languages = acceptLanguage
    .split(',')
    .map((lang) => {
      const [locale, quality] = lang.trim().split(';q=');
      return {
        locale: locale.trim(),
        quality: quality ? Number.parseFloat(quality) : 1,
      };
    })
    .sort((a, b) => b.quality - a.quality);

  for (const { locale } of languages) {
    if (supportedLocales.includes(locale as Locales)) {
      return locale as Locales;
    }

    const langPrefix = locale.split('-')[0];
    const matched = supportedLocales.find((supported) => supported.startsWith(langPrefix));
    if (matched) {
      return matched;
    }
  }

  return null;
}
