import { createInstance } from 'i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import { FALLBACK_LOCALE, getOptions, Locales, LANGUAGE_COOKIE, supportedLocales } from './settings';
import { cookies, headers } from 'next/headers';

async function initI18next(lang: Locales, namespace: string) {
  const i18nInstance = createInstance();
  await i18nInstance
    .use(
      resourcesToBackend(
        // Get the JSON file that matches the locale and namespace
        (lang: string, ns: string) => import(`./locales/${lang}/${ns}.json`),
      ),
    )
    // Initialize i18next with the options we created earlier
    .init(getOptions(lang, namespace));

  return i18nInstance;
}

// This function will be used in our server components for the translation
export async function createTranslation(ns: string) {
  const lang = (await getLocale()) as Locales;
  const i18nextInstance = await initI18next(lang, ns);

  return {
    t: i18nextInstance.getFixedT(lang, Array.isArray(ns) ? ns[0] : ns),
  };
}

// Parse Accept-Language header and return the best matching locale
function parseAcceptLanguage(acceptLanguage: string | null): Locales | null {
  if (!acceptLanguage) return null;

  // Parse Accept-Language header (e.g., "zh-CN,zh;q=0.9,en;q=0.8")
  const languages = acceptLanguage
    .split(',')
    .map((lang) => {
      const [locale, quality] = lang.trim().split(';q=');
      return {
        locale: locale.trim(),
        quality: quality ? parseFloat(quality) : 1,
      };
    })
    .sort((a, b) => b.quality - a.quality);

  // Find the first supported locale
  for (const { locale } of languages) {
    // Exact match
    if (supportedLocales.includes(locale as Locales)) {
      return locale as Locales;
    }
    // Match language prefix (e.g., "zh" matches "zh-CN")
    const langPrefix = locale.split('-')[0];
    const matched = supportedLocales.find((supported) => supported.startsWith(langPrefix));
    if (matched) {
      return matched;
    }
  }

  return null;
}

// Utility function to get the locale from server components
// Priority: 1. Cookie (user preference) 2. Accept-Language header 3. Fallback
export async function getLocale(): Promise<Locales> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LANGUAGE_COOKIE)?.value;

  // If user has set a language preference in cookie, use it
  if (cookieLocale && supportedLocales.includes(cookieLocale as Locales)) {
    return cookieLocale as Locales;
  }

  // Otherwise, detect from Accept-Language header
  const headerStore = await headers();
  const acceptLanguage = headerStore.get('accept-language');
  const detectedLocale = parseAcceptLanguage(acceptLanguage);

  if (detectedLocale) {
    return detectedLocale;
  }

  return FALLBACK_LOCALE as Locales;
}
