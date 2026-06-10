import { useEffect } from 'react';
import i18next, { type i18n as I18nextInstance } from 'i18next';
import { initReactI18next, useTranslation as useTransAlias } from 'react-i18next';

import { useLocale } from './locale-provider';
import { FALLBACK_LOCALE, getOptions, type Locales } from './settings';
import { loadLocaleResources } from './resources';

if (!i18next.isInitialized) {
  void i18next.use(initReactI18next).init({
    ...getOptions(),
    lng: FALLBACK_LOCALE,
    resources: {},
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });
}

const appliedLocales = new Map<Locales, Promise<void>>();

function applyLocaleResources(lng: Locales) {
  let pending = appliedLocales.get(lng);
  if (!pending) {
    pending = loadLocaleResources(lng).then((namespaces) => {
      for (const [namespace, data] of Object.entries(namespaces)) {
        i18next.addResourceBundle(lng, namespace, data, true, false);
      }
    });
    // Drop failed loads so a later call can retry instead of caching the error.
    pending.catch(() => {
      if (appliedLocales.get(lng) === pending) appliedLocales.delete(lng);
    });
    appliedLocales.set(lng, pending);
  }
  return pending;
}

/**
 * Loads the async locale bundle into the shared i18next instance. The fallback
 * locale is loaded alongside so missing keys resolve to the same strings the
 * server rendered, avoiding hydration mismatches.
 */
export function ensureLocaleResources(lng: Locales): Promise<void> {
  const targets = lng === FALLBACK_LOCALE ? [lng] : [lng, FALLBACK_LOCALE];
  return Promise.all(targets.map(applyLocaleResources)).then(() => undefined);
}

export function useTranslation(ns: string) {
  const lng = useLocale();
  const translator = useTransAlias(ns, { i18n: i18next, lng });

  useCustomTranslationImplem(translator.i18n, lng);

  return translator;
}

export async function changeClientLanguage(lng: Locales) {
  await ensureLocaleResources(lng);
  return i18next.changeLanguage(lng);
}

function useCustomTranslationImplem(i18n: I18nextInstance, lng: Locales) {
  useEffect(() => {
    if (!lng || i18n.resolvedLanguage === lng) return;
    let cancelled = false;
    void ensureLocaleResources(lng).then(() => {
      if (!cancelled && i18n.resolvedLanguage !== lng) {
        void i18n.changeLanguage(lng);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [lng, i18n]);
}
