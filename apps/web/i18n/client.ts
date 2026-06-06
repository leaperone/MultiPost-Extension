'use client';

import { useEffect } from 'react';
import i18next, { type i18n as I18nextInstance } from 'i18next';
import { initReactI18next, useTranslation as useTransAlias } from 'react-i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import { Locales, getOptions, supportedLocales, FALLBACK_LOCALE } from './settings';
import { useLocale } from './locale-provider';

const runsOnServerSide = typeof window === 'undefined';

// Initialize i18next for the client side
// Language detection is done server-side via Accept-Language header
// Client only uses the locale passed from server via LocaleProvider
i18next
  .use(initReactI18next)
  .use(resourcesToBackend((lang: string, ns: string) => import(`./locales/${lang}/${ns}.json`)))
  .init({
    ...getOptions(),
    lng: FALLBACK_LOCALE, // Default language, will be overridden by server-detected locale
    preload: runsOnServerSide ? supportedLocales : [],
  });

export function useTranslation(ns: string) {
  const lng = useLocale();

  const translator = useTransAlias(ns, { i18n: i18next, lng });
  const { i18n } = translator;

  // Always call the hook unconditionally - issue #256 root cause was conditional
  // invocation, which changes hook count across renders and crashes the page.
  // Locale synchronization must happen post-commit so render stays side-effect free.
  useCustomTranslationImplem(i18n, lng);

  return translator;
}

function useCustomTranslationImplem(i18n: I18nextInstance, lng: Locales) {
  // This effect changes the language of the application when the lng prop changes.
  useEffect(() => {
    if (!lng || i18n.resolvedLanguage === lng) return;
    i18n.changeLanguage(lng);
  }, [lng, i18n]);
}
