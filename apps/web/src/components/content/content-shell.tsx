'use client';

import { Link, useLocation } from '@tanstack/react-router';
import { ChevronRight, Menu, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

/**
 * Serialized fumadocs page tree (see `serializePageTree`): names arrive as
 * HTML strings rendered server-side, so they are injected via innerHTML on
 * both server and client to keep hydration consistent.
 */
export interface ContentTreePage {
  type: 'page';
  name: string;
  url: string;
  external?: boolean;
}

export interface ContentTreeFolder {
  type: 'folder';
  name?: string;
  index?: ContentTreePage;
  defaultOpen?: boolean;
  children: ContentTreeNode[];
}

export interface ContentTreeSeparator {
  type: 'separator';
  name?: string;
}

export type ContentTreeNode = ContentTreePage | ContentTreeFolder | ContentTreeSeparator;

export interface ContentTreeRoot {
  name?: string;
  children: ContentTreeNode[];
}

interface ContentLocale {
  locale: string;
  name: string;
}

interface ContentNavLink {
  text: string;
  url: string;
}

interface ContentShellProps {
  tree: ContentTreeRoot;
  title: string;
  homeUrl: string;
  navLinks?: ContentNavLink[];
  locales?: ContentLocale[];
  currentLocale?: string;
  /** Path segment index that holds the locale, e.g. 2 for `/docs/{lang}/...` */
  localeSegmentIndex?: number;
  filterPlaceholder?: string;
  children: React.ReactNode;
}

function HtmlName({ name, className }: { name?: string; className?: string }) {
  if (!name) return null;
  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: name }}
    />
  );
}

function folderContains(folder: ContentTreeFolder, pathname: string): boolean {
  if (folder.index && folder.index.url === pathname) return true;
  return folder.children.some((child) => {
    if (child.type === 'page') return child.url === pathname;
    if (child.type === 'folder') return folderContains(child, pathname);
    return false;
  });
}

function filterNodes(nodes: ContentTreeNode[], query: string): ContentTreeNode[] {
  if (!query) return nodes;
  const q = query.toLowerCase();

  return nodes.flatMap((node): ContentTreeNode[] => {
    if (node.type === 'separator') return [];
    if (node.type === 'page') {
      return node.name.toLowerCase().includes(q) ? [node] : [];
    }
    const children = filterNodes(node.children, query);
    const selfMatch = (node.name ?? '').toLowerCase().includes(q) || node.index?.name?.toLowerCase().includes(q);
    if (children.length === 0 && !selfMatch) return [];
    return [{ ...node, children: selfMatch ? node.children : children, defaultOpen: true }];
  });
}

function PageLink({ page, pathname }: { page: ContentTreePage; pathname: string }) {
  const isActive = page.url === pathname;

  return (
    <Link
      to={page.url}
      className={`block rounded-md px-2.5 py-1.5 text-sm transition-colors ${
        isActive ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'
      }`}>
      <HtmlName name={page.name} />
    </Link>
  );
}

function FolderNode({ folder, pathname }: { folder: ContentTreeFolder; pathname: string }) {
  const containsActive = folderContains(folder, pathname);
  const [open, setOpen] = useState(folder.defaultOpen || containsActive);

  useEffect(() => {
    if (containsActive) setOpen(true);
  }, [containsActive]);

  const label = folder.index ? (
    <PageLink
      page={folder.index}
      pathname={pathname}
    />
  ) : (
    <span className="block px-2.5 py-1.5 text-sm text-muted-foreground">
      <HtmlName name={folder.name} />
    </span>
  );

  return (
    <div>
      <div className="flex items-center">
        <div className="min-w-0 flex-1">{label}</div>
        <button
          type="button"
          aria-label={open ? 'Collapse section' : 'Expand section'}
          onClick={() => setOpen((v) => !v)}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground">
          <ChevronRight className={`size-3.5 transition-transform ${open ? 'rotate-90' : ''}`} />
        </button>
      </div>
      {open && (
        <div className="ml-2.5 flex flex-col gap-0.5 border-l pl-2">
          <TreeNodes
            nodes={folder.children}
            pathname={pathname}
          />
        </div>
      )}
    </div>
  );
}

function TreeNodes({ nodes, pathname }: { nodes: ContentTreeNode[]; pathname: string }) {
  return (
    <>
      {nodes.map((node, index) => {
        if (node.type === 'separator') {
          return (
            <p
              key={`sep-${index}`}
              className="px-2.5 pb-1 pt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground first:pt-1">
              <HtmlName name={node.name} />
            </p>
          );
        }
        if (node.type === 'folder') {
          return (
            <FolderNode
              key={`folder-${index}`}
              folder={node}
              pathname={pathname}
            />
          );
        }
        return (
          <PageLink
            key={node.url}
            page={node}
            pathname={pathname}
          />
        );
      })}
    </>
  );
}

function LocaleSwitcher({
  locales,
  currentLocale,
  localeSegmentIndex,
  pathname,
}: {
  locales: ContentLocale[];
  currentLocale: string;
  localeSegmentIndex: number;
  pathname: string;
}) {
  const hrefFor = (locale: string) => {
    const segments = pathname.split('/');
    segments[localeSegmentIndex] = locale;
    return segments.join('/') || '/';
  };

  return (
    <div className="flex flex-wrap items-center gap-1">
      {locales.map((item) => (
        <Link
          key={item.locale}
          to={hrefFor(item.locale)}
          className={`rounded-md px-2 py-1 text-xs transition-colors ${
            item.locale === currentLocale
              ? 'bg-muted font-medium text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}>
          {item.name}
        </Link>
      ))}
    </div>
  );
}

export function ContentShell({
  tree,
  title,
  homeUrl,
  navLinks = [],
  locales = [],
  currentLocale,
  localeSegmentIndex = 2,
  filterPlaceholder = 'Filter pages…',
  children,
}: ContentShellProps) {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const visibleNodes = useMemo(() => filterNodes(tree.children, query.trim()), [tree.children, query]);

  const sidebar = (
    <div className="flex h-full flex-col gap-3 p-4">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={filterPlaceholder}
        className="w-full rounded-md bg-muted px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
      />
      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
        <TreeNodes
          nodes={visibleNodes}
          pathname={pathname}
        />
      </nav>
      {locales.length > 1 && currentLocale && (
        <div className="border-t pt-3">
          <LocaleSwitcher
            locales={locales}
            currentLocale={currentLocale}
            localeSegmentIndex={localeSegmentIndex}
            pathname={pathname}
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-screen-2xl items-center gap-4 px-4 md:px-6">
          <button
            type="button"
            aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
            onClick={() => setMobileOpen((v) => !v)}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground md:hidden">
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <Link
            to={homeUrl}
            className="flex items-center gap-2 font-semibold">
            <img
              src="/favicon.ico"
              alt=""
              width={22}
              height={22}
            />
            {title}
          </Link>
          <nav className="ml-auto flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.url}
                to={link.url}
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
                {link.text}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-screen-2xl flex-1">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-64 shrink-0 border-r md:block">
          {sidebar}
        </aside>

        {mobileOpen && (
          <div className="fixed inset-x-0 bottom-0 top-14 z-30 overflow-y-auto bg-background md:hidden">{sidebar}</div>
        )}

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
