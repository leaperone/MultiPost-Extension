'use client';

import { RootProvider } from 'fumadocs-ui/provider/tanstack';
import type { ReactNode } from 'react';
import { useLocation, useNavigate } from '@tanstack/react-router';

import { blogI18n } from './blog-i18n';
import { docsI18n } from './docs-i18n';

const docsLocaleNames: Record<string, string> = {
  zh: '简体中文',
  en: 'English',
};

const blogLocaleNames: Record<string, string> = {
  en: 'English',
  'zh-Hans': '简体中文',
  'zh-Hant': '繁體中文',
  ja: '日本語',
  ko: '한국어',
  fr: 'Français',
  es: 'Español',
  pt: 'Português',
  ms: 'Melayu',
  id: 'Bahasa Indonesia',
  ru: 'Русский',
};

type FumadocsRootProviderProps = {
  lang: string;
  section: 'docs' | 'blog';
  children: ReactNode;
};

export function FumadocsRootProvider({
  lang,
  section,
  children,
}: FumadocsRootProviderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const i18n = section === 'docs' ? docsI18n : blogI18n;
  const localeNames = section === 'docs' ? docsLocaleNames : blogLocaleNames;

  const handleLocaleChange = (newLocale: string) => {
    const segments = location.pathname.split('/');

    if (segments.length >= 3 && segments[1] === section) {
      segments[2] = newLocale;
      void navigate({ href: segments.join('/') });
      return;
    }

    void navigate({ href: `/${section}/${newLocale}` });
  };

  return (
    <RootProvider
      i18n={{
        locale: lang,
        locales: i18n.languages.map((locale) => ({
          locale,
          name: localeNames[locale] || locale,
        })),
        onLocaleChange: handleLocaleChange,
      }}>
      {children}
    </RootProvider>
  );
}
