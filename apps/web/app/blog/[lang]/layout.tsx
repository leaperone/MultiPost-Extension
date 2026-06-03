import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { blogSource } from '@/lib/blog-source';
import { blogI18n } from '@/lib/blog-i18n';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import Image from 'next/image';
import { BlogRootProvider } from './provider';

function baseOptions(lang: string): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          <Image src="/favicon.ico" alt="Logo" width={24} height={24} />
          MultiPost Blog
        </>
      ),
      enabled: true,
      url: `/blog/${lang}`,
    },
    links: [
      {
        text: 'Home',
        url: '/',
      },
    ],
    i18n: blogI18n,
  };
}

export default async function BlogLangLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (!blogI18n.languages.includes(lang)) {
    notFound();
  }

  const tree = blogSource.pageTree[lang];
  if (!tree) {
    notFound();
  }

  return (
    <BlogRootProvider lang={lang}>
      <DocsLayout tree={tree} {...baseOptions(lang)}>
        {children}
      </DocsLayout>
    </BlogRootProvider>
  );
}
