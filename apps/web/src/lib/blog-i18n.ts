import type { I18nConfig } from 'fumadocs-core/i18n';

export const blogI18n: I18nConfig = {
  defaultLanguage: 'en',
  languages: [
    'en',
    'zh-Hans',
    'zh-Hant',
    'ja',
    'ko',
    'fr',
    'es',
    'pt',
    'ms',
    'id',
    'ru',
  ],
};

export const DEFAULT_BLOG_LANG = blogI18n.defaultLanguage;

const blogLanguageAliases: Record<string, string> = {
  zh: 'zh-Hans',
};

export function resolveBlogLang(lang: string) {
  return blogLanguageAliases[lang] ?? lang;
}

export function isBlogLang(lang: string) {
  return blogI18n.languages.includes(resolveBlogLang(lang));
}
