import { createServerFn } from '@tanstack/react-start';
import { createFileRoute, notFound, Outlet, redirect } from '@tanstack/react-router';
import { z } from 'zod';

import { ContentShell } from '../../components/content/content-shell';
import type { ContentTreeRoot } from '../../components/content/content-shell';
import { DEFAULT_DOCS_LANG, docsI18n } from '../../lib/docs-i18n';

const docsShellSchema = z.object({
  lang: z.string().min(1),
});

const loadDocsShell = createServerFn({ method: 'GET' })
  .validator(docsShellSchema)
  .handler(async ({ data }) => {
    const { getDocsShellData } = await import('../../lib/docs-source');
    return getDocsShellData(data.lang);
  });

const docsLocaleNames: Record<string, string> = {
  zh: '简体中文',
  en: 'English',
};

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
  const { pageTree } = Route.useLoaderData();

  return (
    <ContentShell
      tree={pageTree as unknown as ContentTreeRoot}
      title="MultiPost Docs"
      homeUrl={`/docs/${lang}`}
      navLinks={[
        { text: 'Home', url: '/' },
        { text: 'Blog', url: '/blog/en' },
      ]}
      locales={docsI18n.languages.map((locale) => ({
        locale,
        name: docsLocaleNames[locale] || locale,
      }))}
      currentLocale={lang}
      filterPlaceholder={lang === 'zh' ? '筛选页面…' : 'Filter pages…'}>
      <Outlet />
    </ContentShell>
  );
}
