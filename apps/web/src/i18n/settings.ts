import type { InitOptions } from 'i18next';

export const FALLBACK_LOCALE = 'en';
export const supportedLocales = ['en', 'zh-CN'] as const;
export type Locales = (typeof supportedLocales)[number];

export const LANGUAGE_COOKIE = 'chosen_language';

export function getOptions(lang = FALLBACK_LOCALE, ns = 'common'): InitOptions {
  return {
    // debug: true,
    supportedLngs: supportedLocales,
    fallbackLng: FALLBACK_LOCALE,
    lng: lang,
    ns,
  };
}

export const languages = [
  { value: 'en', label: 'English' },
  { value: 'zh-CN', label: '简体中文' },
] as const;
