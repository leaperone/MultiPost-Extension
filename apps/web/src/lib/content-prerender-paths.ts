import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { blogI18n } from './blog-i18n';
import { docsI18n } from './docs-i18n';

const docsContentDir = fileURLToPath(new URL('../../content/docs', import.meta.url));
const blogContentDir = fileURLToPath(new URL('../../content/blog', import.meta.url));

export function getDocsPrerenderPaths() {
  return [
    '/docs',
    ...docsI18n.languages.map((lang) => `/docs/${lang}`),
    ...getLocalizedContentPaths({
      contentDir: docsContentDir,
      baseUrl: '/docs',
      defaultLanguage: docsI18n.defaultLanguage,
      languages: docsI18n.languages,
    }),
  ];
}

export function getBlogPrerenderPaths() {
  return [
    '/blog',
    ...blogI18n.languages.map((lang) => `/blog/${lang}`),
    ...getLocalizedContentPaths({
      contentDir: blogContentDir,
      baseUrl: '/blog',
      defaultLanguage: blogI18n.defaultLanguage,
      languages: blogI18n.languages,
    }),
  ];
}

function getLocalizedContentPaths({
  contentDir,
  baseUrl,
  defaultLanguage,
  languages,
}: {
  contentDir: string;
  baseUrl: string;
  defaultLanguage: string;
  languages: string[];
}) {
  const paths = collectMdxFiles(contentDir)
    .map((relativePath) => toLocalizedRoutePath(relativePath, {
      baseUrl,
      defaultLanguage,
      languages,
    }))
    .filter((routePath): routePath is string => Boolean(routePath));

  return Array.from(new Set(paths)).sort();
}

function collectMdxFiles(dir: string, prefix = ''): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const absolutePath = path.join(dir, entry);
    const relativePath = prefix ? `${prefix}/${entry}` : entry;
    const stat = statSync(absolutePath);

    if (stat.isDirectory()) {
      return collectMdxFiles(absolutePath, relativePath);
    }

    return entry.endsWith('.mdx') ? [relativePath] : [];
  });
}

function toLocalizedRoutePath(
  relativePath: string,
  {
    baseUrl,
    defaultLanguage,
    languages,
  }: {
    baseUrl: string;
    defaultLanguage: string;
    languages: string[];
  },
) {
  const slugParts = relativePath.replace(/\.mdx$/, '').split('/');
  const filename = slugParts.at(-1);
  if (!filename) return null;

  const language = languages.find(
    (lang) => lang !== defaultLanguage && filename.endsWith(`.${lang}`),
  ) ?? defaultLanguage;
  const localizedSuffix = language === defaultLanguage ? '' : `.${language}`;
  const basename = localizedSuffix
    ? filename.slice(0, -localizedSuffix.length)
    : filename;

  slugParts[slugParts.length - 1] = basename;

  if (slugParts.at(-1) === 'index') {
    slugParts.pop();
  }

  const slugPath = slugParts.length > 0 ? `/${slugParts.join('/')}` : '';

  return `${baseUrl}/${language}${slugPath}`;
}
