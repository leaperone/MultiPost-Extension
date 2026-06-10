import { loader } from 'fumadocs-core/source';
import type { TableOfContents } from 'fumadocs-core/toc';
import { blog } from 'collections/server';

import { blogI18n } from './blog-i18n';
export { getBlogPrerenderPaths } from './content-prerender-paths';

export type SerializableToc = Array<{
  title: string;
  url: string;
  depth: number;
}>;

export const blogSource = loader({
  i18n: blogI18n,
  baseUrl: '/blog',
  source: blog.toFumadocsSource(),
  url: (slugs, locale) => {
    const lang = locale ?? blogI18n.defaultLanguage;
    const slugPath = slugs.length > 0 ? `/${slugs.join('/')}` : '';
    return `/blog/${lang}${slugPath}`;
  },
});

export type BlogPageData = {
  path: string;
  url: string;
  slugs: string[];
  locale?: string;
  title: string;
  description?: string;
  toc: SerializableToc;
  full?: boolean;
  keywords?: string;
  author?: string;
  date?: string;
};

export type BlogListItem = Pick<
  BlogPageData,
  'url' | 'title' | 'description' | 'keywords' | 'author' | 'date'
>;

function serializeToc(toc: TableOfContents): SerializableToc {
  return toc.map((item) => ({
    title: typeof item.title === 'string' ? item.title : '',
    url: item.url,
    depth: item.depth,
  }));
}

function serializeBlogPage(page: ReturnType<typeof blogSource.getPages>[number]): BlogPageData {
  return {
    path: page.path,
    url: page.url,
    slugs: page.slugs,
    locale: page.locale,
    title: page.data.title,
    description: page.data.description,
    toc: serializeToc(page.data.toc),
    full: page.data.full,
    keywords: page.data.keywords,
    author: page.data.author,
    date: page.data.date ? page.data.date.toISOString() : undefined,
  };
}

export async function getBlogShellData(lang: string) {
  const tree = blogSource.pageTree[lang];
  if (!tree) return null;

  return {
    pageTree: await blogSource.serializePageTree(tree),
  };
}

export function getBlogPageData(lang: string, slug: string[]): BlogPageData | null {
  const page = blogSource.getPage(slug, lang);
  if (!page) return null;

  return serializeBlogPage(page);
}

export function getBlogListData(lang: string): BlogListItem[] {
  return blogSource
    .getPages(lang)
    .sort((a, b) => {
      const dateA = a.data.date;
      const dateB = b.data.date;

      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;

      return dateB.getTime() - dateA.getTime();
    })
    .map((page) => {
      const serialized = serializeBlogPage(page);

      return {
        url: serialized.url,
        title: serialized.title,
        description: serialized.description,
        keywords: serialized.keywords,
        author: serialized.author,
        date: serialized.date,
      };
    });
}

export function getBlogPathMap(lang: string) {
  return blogSource.getPages(lang).map((page) => ({
    path: page.path,
    url: page.url,
  }));
}
