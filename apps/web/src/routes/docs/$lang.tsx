import { createServerFn } from '@tanstack/react-start';
import { createFileRoute, notFound, Outlet, redirect } from '@tanstack/react-router';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { useFumadocsLoader } from 'fumadocs-core/source/client';
import { z } from 'zod';

import { DEFAULT_DOCS_LANG, docsI18n } from '../../lib/docs-i18n';
import { FumadocsRootProvider } from '../../lib/fumadocs-providers';

const docsShellSchema = z.object({
  lang: z.string().min(1),
});

const loadDocsShell = createServerFn({ method: 'GET' })
  .validator(docsShellSchema)
  .handler(async ({ data }) => {
    const { getDocsShellData } = await import('../../lib/docs-source');
    return getDocsShellData(data.lang);
  });

function docsBaseOptions(lang: string): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          <img
            src="/favicon.ico"
            alt="Logo"
            width={24}
            height={24}
          />
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

export const Route = createFileRoute('/docs/$lang')({
  beforeLoad: ({ params, location }) => {
    if (docsI18n.languages.includes(params.lang)) return;

    const parts = location.pathname.split('/').filter(Boolean);
    if (parts[0] === 'docs' && parts[1]) {
      const slug = parts.slice(1).join('/');
      throw redirect({
        href: `/docs/${DEFAULT_DOCS_LANG}/${slug}`,
        statusCode: 302,
      });
    }

    throw notFound();
  },
  loader: async ({ params }) => {
    const data = await loadDocsShell({ data: { lang: params.lang } });
    if (!data) throw notFound();

    return data;
  },
  component: DocsLangLayout,
});

function DocsLangLayout() {
  const { lang } = Route.useParams();
  const data = useFumadocsLoader(Route.useLoaderData());

  if (!data.pageTree) throw notFound();

  return (
    <FumadocsRootProvider
      section="docs"
      lang={lang}>
      <DocsLayout
        tree={data.pageTree}
        {...docsBaseOptions(lang)}>
        <Outlet />
      </DocsLayout>
    </FumadocsRootProvider>
  );
}
