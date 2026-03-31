'use client';

import { RootProvider } from 'fumadocs-ui/provider/next';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { docsI18n } from '@/lib/docs-i18n';

const localeNames: Record<string, string> = {
  zh: '简体中文',
  en: 'English',
};

interface DocsRootProviderProps {
  lang: string;
  children: ReactNode;
}

export function DocsRootProvider({ lang, children }: DocsRootProviderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLocaleChange = (newLocale: string) => {
    // Current path is like /docs/zh/article-slug or /docs/zh
    // We need to replace the language segment
    const segments = pathname.split('/');
    // segments: ['', 'docs', 'zh', ...rest]
    if (segments.length >= 3 && segments[1] === 'docs') {
      segments[2] = newLocale;
      const newPath = segments.join('/');
      router.push(newPath);
    } else {
      // Fallback: just go to the new locale's docs home
      router.push(`/docs/${newLocale}`);
    }
  };

  return (
    <RootProvider
      i18n={{
        locale: lang,
        locales: docsI18n.languages.map((l) => ({
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
