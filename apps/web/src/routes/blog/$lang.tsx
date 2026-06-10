import { createServerFn } from '@tanstack/react-start';
import { createFileRoute, notFound, Outlet } from '@tanstack/react-router';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { useFumadocsLoader } from 'fumadocs-core/source/client';
import { z } from 'zod';

import { blogI18n, isBlogLang, resolveBlogLang } from '../../lib/blog-i18n';
import { FumadocsRootProvider } from '../../lib/fumadocs-providers';

const blogShellSchema = z.object({
  lang: z.string().min(1),
});

const loadBlogShell = createServerFn({ method: 'GET' })
  .validator(blogShellSchema)
  .handler(async ({ data }) => {
    const { getBlogShellData } = await import('../../lib/blog-source');
    return getBlogShellData(data.lang);
  });

function blogBaseOptions(lang: string): BaseLayoutProps {
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

export const Route = createFileRoute('/blog/$lang')({
  beforeLoad: ({ params }) => {
    if (!isBlogLang(params.lang)) {
      throw notFound();
    }
  },
  loader: async ({ params }) => {
    const data = await loadBlogShell({ data: { lang: resolveBlogLang(params.lang) } });
    if (!data) throw notFound();

    return data;
  },
  component: BlogLangLayout,
});

function BlogLangLayout() {
  const { lang: routeLang } = Route.useParams();
  const lang = resolveBlogLang(routeLang);
  const data = useFumadocsLoader(Route.useLoaderData());

  if (!data.pageTree) throw notFound();

  return (
    <FumadocsRootProvider
      section="blog"
      lang={lang}>
      <DocsLayout
        tree={data.pageTree}
        {...blogBaseOptions(lang)}>
        <Outlet />
      </DocsLayout>
    </FumadocsRootProvider>
  );
}
