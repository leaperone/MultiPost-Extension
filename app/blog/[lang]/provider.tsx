'use client';

import { RootProvider } from 'fumadocs-ui/provider';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { blogI18n } from '@/lib/blog-i18n';

const localeNames: Record<string, string> = {
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

interface BlogRootProviderProps {
  lang: string;
  children: ReactNode;
}

export function BlogRootProvider({ lang, children }: BlogRootProviderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLocaleChange = (newLocale: string) => {
    // Current path is like /blog/en/article-slug or /blog/en
    // We need to replace the language segment
    const segments = pathname.split('/');
    // segments: ['', 'blog', 'en', ...rest]
    if (segments.length >= 3 && segments[1] === 'blog') {
      segments[2] = newLocale;
      const newPath = segments.join('/');
      router.push(newPath);
    } else {
      // Fallback: just go to the new locale's blog home
      router.push(`/blog/${newLocale}`);
    }
  };

  return (
    <RootProvider
      i18n={{
        locale: lang,
        locales: blogI18n.languages.map((l) => ({
          locale: l,
          name: localeNames[l] || l,
        })),
        onLocaleChange: handleLocaleChange,
      }}
    >
      {children}
    </RootProvider>
  );
}
