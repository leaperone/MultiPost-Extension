import { useEffect } from 'react';
import i18next, { type i18n as I18nextInstance } from 'i18next';
import { initReactI18next, useTranslation as useTransAlias } from 'react-i18next';

import { useLocale } from './locale-provider';
import { FALLBACK_LOCALE, getOptions, supportedLocales, type Locales } from './settings';
import { resources } from './resources';

if (!i18next.isInitialized) {
  void i18next.use(initReactI18next).init({
    ...getOptions(),
    lng: FALLBACK_LOCALE,
    preload: supportedLocales,
    resources,
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });
}

export function useTranslation(ns: string) {
  const lng = useLocale();
  const translator = useTransAlias(ns, { i18n: i18next, lng });

  useCustomTranslationImplem(translator.i18n, lng);

  return translator;
}

function useCustomTranslationImplem(i18n: I18nextInstance, lng: Locales) {
  useEffect(() => {
    if (!lng || i18n.resolvedLanguage === lng) return;
    void i18n.changeLanguage(lng);
  }, [lng, i18n]);
}
