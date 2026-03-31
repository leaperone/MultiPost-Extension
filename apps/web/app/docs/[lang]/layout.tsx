import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';
import { docsSource } from '@/lib/docs-source';
import { docsI18n } from '@/lib/docs-i18n';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import Image from 'next/image';
import { DocsRootProvider } from './provider';
import { notFound } from 'next/navigation';

function baseOptions(lang: string): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          <Image src="/favicon.ico" alt="Logo" width={24} height={24} />
          MultiPost Docs
        </>
      ),
      enabled: true,
      url: `/docs/${lang}`,
    },
    links: [
      {
        text: 'Home',
        url: '/',
      },
      {
        text: 'Blog',
        url: '/blog/en',
      },
    ],
    i18n: docsI18n,
  };
}

export default async function DocsLangLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  // Validate language parameter
  if (!docsI18n.languages.includes(lang)) {
    notFound();
  }

  return (
    <DocsRootProvider lang={lang}>
      <DocsLayout tree={docsSource.pageTree[lang]} {...baseOptions(lang)}>
        {children}
      </DocsLayout>
    </DocsRootProvider>
  );
}
