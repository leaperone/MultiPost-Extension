import { createServerFn } from '@tanstack/react-start';
import { createFileRoute, notFound, redirect } from '@tanstack/react-router';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/page';
import { Suspense } from 'react';
import { z } from 'zod';

import {
  blogClientLoader,
  createClientRelativeLink,
} from '../../../lib/fumadocs-client';
import { resolveBlogLang } from '../../../lib/blog-i18n';
import { getMDXComponents } from '../../../lib/mdx-components';
import { SITE_URL } from '../../../lib/seo';

const blogPageSchema = z.object({
  lang: z.string().min(1),
  slug: z.array(z.string()).default([]),
});

const loadBlogPage = createServerFn({ method: 'GET' })
  .validator(blogPageSchema)
  .handler(async ({ data }) => {
    const { getBlogPageData, getBlogPathMap } = await import('../../../lib/blog-source');
    const page = getBlogPageData(data.lang, data.slug);
    if (!page) return null;

    return {
      page,
      pathMap: getBlogPathMap(data.lang),
    };
  });

export const Route = createFileRoute('/blog/$lang/$')({
  loader: async ({ params }) => {
    const lang = resolveBlogLang(params.lang);
    const slug = toSlug(params._splat);

    if (slug.length === 0) {
      throw redirect({
        href: `/blog/${lang}`,
        statusCode: 302,
      });
    }

    const data = await loadBlogPage({ data: { lang, slug } });
    if (!data) throw notFound();

    return data;
  },
  head: ({ loaderData }) => {
    const page = loaderData?.page;
    if (!page) {
      return {
        meta: [{ title: 'Blog - MultiPost' }],
      };
    }

    const url = `${SITE_URL}${page.url}`;
    const publishedTime = page.date ? new Date(page.date).toISOString() : undefined;
    const author = page.author || 'MultiPost Team';
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: page.title,
      description: page.description,
      image: `${SITE_URL}/og-image.png`,
      datePublished: publishedTime,
      dateModified: publishedTime,
      author: {
        '@type': 'Person',
        name: author,
      },
      publisher: {
        '@type': 'Organization',
        name: 'MultiPost',
        logo: {
          '@type': 'ImageObject',
          url: `${SITE_URL}/og-image.png`,
        },
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': url,
      },
    };

    return {
      meta: [
        { title: page.title },
        ...(page.description
          ? [{ name: 'description', content: page.description }]
          : []),
        ...(page.keywords ? [{ name: 'keywords', content: page.keywords }] : []),
        { name: 'author', content: author },
        { property: 'og:type', content: 'article' },
        {
          property: 'og:locale',
          content: page.locale === 'zh-Hans' ? 'zh_CN' : 'en_US',
        },
        { property: 'og:url', content: url },
        { property: 'og:title', content: page.title },
        ...(page.description
          ? [{ property: 'og:description', content: page.description }]
          : []),
        { property: 'og:site_name', content: 'MultiPost Blog' },
        { property: 'og:image', content: `${SITE_URL}/og-image.png` },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        ...(publishedTime
          ? [{ property: 'article:published_time', content: publishedTime }]
          : []),
        { property: 'article:author', content: author },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: page.title },
        ...(page.description
          ? [{ name: 'twitter:description', content: page.description }]
          : []),
        { name: 'twitter:image', content: `${SITE_URL}/twitter-image.png` },
        { name: 'twitter:creator', content: '@multipost_app' },
        { 'script:ld+json': jsonLd },
      ],
      links: [{ rel: 'canonical', href: url }],
    };
  },
  component: BlogArticlePage,
});

function BlogArticlePage() {
  const { page, pathMap } = Route.useLoaderData();
  const components = getMDXComponents({
    a: createClientRelativeLink(page.path, pathMap),
  });

  return (
    <DocsPage
      toc={page.toc}
      full={page.full}>
      <DocsTitle>{page.title}</DocsTitle>
      <DocsDescription>{page.description}</DocsDescription>
      <DocsBody>
        <Suspense fallback={null}>
          {blogClientLoader.useContent(page.path, { components })}
        </Suspense>
      </DocsBody>
    </DocsPage>
  );
}

function toSlug(splat: string | undefined) {
  return splat ? splat.split('/').filter(Boolean) : [];
}
