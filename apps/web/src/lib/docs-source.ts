import { findNeighbour } from 'fumadocs-core/page-tree';
import { loader } from 'fumadocs-core/source';
import type { TableOfContents } from 'fumadocs-core/toc';
import { docs } from 'collections/server';

import { docsI18n } from './docs-i18n';
export { getDocsPrerenderPaths } from './content-prerender-paths';

export type SerializableToc = Array<{
  title: string;
  url: string;
  depth: number;
}>;

export const docsSource = loader({
  i18n: docsI18n,
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
  url: (slugs, locale) => {
    const lang = locale ?? docsI18n.defaultLanguage;
    const slugPath = slugs.length > 0 ? `/${slugs.join('/')}` : '';
    return `/docs/${lang}${slugPath}`;
  },
});

export type DocsPageData = {
  path: string;
  url: string;
  slugs: string[];
  locale?: string;
  title: string;
  description?: string;
  toc: SerializableToc;
  full?: boolean;
};

function serializeToc(toc: TableOfContents): SerializableToc {
  return toc.map((item) => ({
    title: typeof item.title === 'string' ? item.title : '',
    url: item.url,
    depth: item.depth,
  }));
}

export async function getDocsShellData(lang: string) {
  const tree = docsSource.pageTree[lang];
  if (!tree) return null;

  return {
    pageTree: await docsSource.serializePageTree(tree),
  };
}

export function getDocsPageData(lang: string, slug: string[]): DocsPageData | null {
  const page = docsSource.getPage(slug, lang);
  if (!page) return null;

  return {
    path: page.path,
    url: page.url,
    slugs: page.slugs,
    locale: page.locale,
    title: page.data.title,
    description: page.data.description,
    toc: serializeToc(page.data.toc),
    full: page.data.full,
  };
}

export interface DocsNeighbour {
  title: string;
  url: string;
}

export function getDocsNeighbours(
  lang: string,
  url: string,
): { previous?: DocsNeighbour; next?: DocsNeighbour } {
  const tree = docsSource.pageTree[lang];
  if (!tree) return {};

  const toNeighbour = (item?: { name?: unknown; url?: string }): DocsNeighbour | undefined => {
    if (!item?.url || typeof item.name !== 'string') return undefined;
    return { title: item.name, url: item.url };
  };

  const { previous, next } = findNeighbour(tree, url);
  return { previous: toNeighbour(previous), next: toNeighbour(next) };
}

export function getDocsPathMap(lang: string) {
  return docsSource.getPages(lang).map((page) => ({
    path: page.path,
    url: page.url,
  }));
}
