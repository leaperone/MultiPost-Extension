import { docsSource } from '@/lib/docs-source';
import {
  DocsPage,
  DocsBody,
  DocsDescription,
  DocsTitle,
} from 'fumadocs-ui/page';
import { notFound, redirect } from 'next/navigation';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { getMDXComponents } from '@/mdx-components';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ lang: string; slug?: string[] }>;
}

export default async function Page({ params }: PageProps) {
  const { lang, slug } = await params;

  // Redirect root /docs/{lang} to /docs/{lang}/user-guide
  if (!slug || slug.length === 0) {
    redirect(`/docs/${lang}/user-guide`);
  }

  const page = docsSource.getPage(slug, lang);

  if (!page) notFound();

  const MDXContent = page.data.body;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDXContent
          components={getMDXComponents({
            a: createRelativeLink(docsSource, page),
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return docsSource.generateParams();
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { lang, slug } = await params;

  const page = docsSource.getPage(slug, lang);

  if (!page) notFound();

  const url = `https://multipost.app/docs/${lang}/${slug?.join('/') || ''}`;

  return {
    title: page.data.title,
    description: page.data.description,
    openGraph: {
      type: 'article',
      locale: lang === 'zh' ? 'zh_CN' : 'en_US',
      url: url,
      title: page.data.title,
      description: page.data.description,
      siteName: 'MultiPost Docs',
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: page.data.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: page.data.title,
      description: page.data.description,
      images: ['/twitter-image.png'],
      creator: '@multipost_app',
    },
    alternates: {
      canonical: url,
    },
  };
}
