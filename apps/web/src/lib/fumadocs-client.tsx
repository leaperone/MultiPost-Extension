'use client';

import { createElement } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import browserCollections from 'collections/browser';

import type { AnchorComponent, MDXComponents } from './mdx-components';

type PagePathMap = Array<{
  path: string;
  url: string;
}>;

type MDXRenderProps = {
  components?: MDXComponents;
};

export const docsClientLoader = browserCollections.docs.createClientLoader<MDXRenderProps>({
  id: 'docs',
  component: (loaded, props) => createElement(loaded.default, props),
});

export const blogClientLoader = browserCollections.blog.createClientLoader<MDXRenderProps>({
  id: 'blog',
  component: (loaded, props) => createElement(loaded.default, props),
});

export function createClientRelativeLink(pagePath: string, pathMap: PagePathMap): AnchorComponent {
  const byPath = new Map(pathMap.map((page) => [normalizePagePath(page.path), page.url]));

  function resolveHref(href: string | undefined) {
    if (!href || isExternalOrAbsolute(href)) return href;

    const [rawPath, hash] = href.split('#');
    const normalized = normalizePagePath(resolveRelativePath(pagePath, rawPath || pagePath));
    const mapped = byPath.get(normalized);

    if (!mapped) return href;
    return hash ? `${mapped}#${hash}` : mapped;
  }

  return function RelativeLink({
    href,
    ...props
  }: ComponentProps<'a'>): ReactNode {
    return <a href={resolveHref(href)} {...props} />;
  };
}

function isExternalOrAbsolute(href: string) {
  return (
    href.startsWith('/') ||
    href.startsWith('#') ||
    /^[a-z][a-z0-9+.-]*:/i.test(href) ||
    href.startsWith('//')
  );
}

function resolveRelativePath(pagePath: string, href: string) {
  if (href.startsWith('.')) {
    const base = pagePath.split('/').slice(0, -1).join('/');
    return normalizeSegments(`${base}/${href}`);
  }

  return href;
}

function normalizeSegments(value: string) {
  const out: string[] = [];

  for (const segment of value.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      out.pop();
      continue;
    }
    out.push(segment);
  }

  return out.join('/');
}

function normalizePagePath(value: string) {
  return value.replace(/^\.\//, '').replace(/\\/g, '/');
}
