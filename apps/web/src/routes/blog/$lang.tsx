import { createServerFn } from '@tanstack/react-start';
import { createFileRoute, notFound, Outlet } from '@tanstack/react-router';
import { z } from 'zod';

import { ContentShell } from '../../components/content/content-shell';
import type { ContentTreeRoot } from '../../components/content/content-shell';
import { blogI18n, isBlogLang, resolveBlogLang } from '../../lib/blog-i18n';

const blogShellSchema = z.object({
  lang: z.string().min(1),
});

const loadBlogShell = createServerFn({ method: 'GET' })
  .validator(blogShellSchema)
  .handler(async ({ data }) => {
    const { getBlogShellData } = await import('../../lib/blog-source');
    return getBlogShellData(data.lang);
  });

const blogLocaleNames: Record<string, string> = {
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
  const { pageTree } = Route.useLoaderData();

  return (
    <ContentShell
      tree={pageTree as unknown as ContentTreeRoot}
      title="MultiPost Blog"
      homeUrl={`/blog/${lang}`}
      navLinks={[
        { text: 'Home', url: '/' },
        { text: 'Docs', url: '/docs/zh' },
      ]}
      locales={blogI18n.languages.map((locale) => ({
        locale,
        name: blogLocaleNames[locale] || locale,
      }))}
      currentLocale={lang}>
      <Outlet />
    </ContentShell>
  );
}
