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
  createClientRelativeLink,
  docsClientLoader,
} from '../../../lib/fumadocs-client';
import { getMDXComponents } from '../../../lib/mdx-components';
import { SITE_URL } from '../../../lib/seo';

const docsPageSchema = z.object({
  lang: z.string().min(1),
  slug: z.array(z.string()).default([]),
});

const loadDocsPage = createServerFn({ method: 'GET' })
  .validator(docsPageSchema)
  .handler(async ({ data }) => {
    const { getDocsPageData, getDocsPathMap } = await import('../../../lib/docs-source');
    const page = getDocsPageData(data.lang, data.slug);
    if (!page) return null;

    return {
      page,
      pathMap: getDocsPathMap(data.lang),
    };
  });

export const Route = createFileRoute('/docs/$lang/$')({
  loader: async ({ params }) => {
    const slug = toSlug(params._splat);

    if (slug.length === 0) {
      throw redirect({
        href: `/docs/${params.lang}/user-guide`,
        statusCode: 302,
      });
    }

    const data = await loadDocsPage({ data: { lang: params.lang, slug } });
    if (!data) throw notFound();

    return data;
  },
  head: ({ loaderData }) => {
    const page = loaderData?.page;
    if (!page) {
      return {
        meta: [{ title: 'Documentation - MultiPost' }],
      };
    }

    const url = `${SITE_URL}${page.url}`;

    return {
      meta: [
        { title: page.title },
        ...(page.description
          ? [{ name: 'description', content: page.description }]
          : []),
        { property: 'og:type', content: 'article' },
        {
          property: 'og:locale',
          content: page.locale === 'zh' ? 'zh_CN' : 'en_US',
        },
        { property: 'og:url', content: url },
        { property: 'og:title', content: page.title },
        ...(page.description
          ? [{ property: 'og:description', content: page.description }]
          : []),
        { property: 'og:site_name', content: 'MultiPost Docs' },
        { property: 'og:image', content: `${SITE_URL}/og-image.png` },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:image:alt', content: page.title },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: page.title },
        ...(page.description
          ? [{ name: 'twitter:description', content: page.description }]
          : []),
        { name: 'twitter:image', content: `${SITE_URL}/twitter-image.png` },
        { name: 'twitter:creator', content: '@multipost_app' },
      ],
      links: [{ rel: 'canonical', href: url }],
    };
  },
  component: DocsArticlePage,
});

function DocsArticlePage() {
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
          {docsClientLoader.useContent(page.path, { components })}
        </Suspense>
      </DocsBody>
    </DocsPage>
  );
}

function toSlug(splat: string | undefined) {
  return splat ? splat.split('/').filter(Boolean) : [];
}
