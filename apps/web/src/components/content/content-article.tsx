'use client';

import { Link } from '@tanstack/react-router';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface ContentTocItem {
  title: string;
  url: string;
  depth: number;
}

export interface ContentNeighbour {
  title: string;
  url: string;
}

interface ContentArticleProps {
  title: string;
  description?: string;
  /** Extra line under the description, e.g. blog author/date. */
  meta?: React.ReactNode;
  toc?: ContentTocItem[];
  previous?: ContentNeighbour;
  next?: ContentNeighbour;
  children: React.ReactNode;
}

function Toc({ items }: { items: ContentTocItem[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const headings = items
      .map((item) => document.getElementById(decodeURIComponent(item.url.replace(/^#/, ''))))
      .filter((el): el is HTMLElement => el !== null);
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-80px 0px -70% 0px' },
    );
    headings.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav
      aria-label="Table of contents"
      className="sticky top-20 hidden max-h-[calc(100vh-6rem)] w-56 shrink-0 self-start overflow-y-auto xl:block">
      <p className="pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">On this page</p>
      <ul className="flex flex-col gap-1 border-l">
        {items.map((item) => {
          const id = decodeURIComponent(item.url.replace(/^#/, ''));
          const isActive = id === activeId;
          return (
            <li key={item.url}>
              <a
                href={item.url}
                className={`-ml-px block border-l py-0.5 text-sm transition-colors ${
                  isActive
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                style={{ paddingLeft: `${Math.max(item.depth - 1, 1) * 0.75}rem` }}>
                {item.title}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function NeighbourLink({ neighbour, direction }: { neighbour: ContentNeighbour; direction: 'previous' | 'next' }) {
  const isNext = direction === 'next';

  return (
    <Link
      to={neighbour.url}
      className={`flex flex-1 flex-col gap-1 rounded-lg border p-4 transition-colors hover:bg-muted ${
        isNext ? 'items-end text-right' : 'items-start'
      }`}>
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        {!isNext && <ArrowLeft className="size-3.5" />}
        {isNext ? 'Next' : 'Previous'}
        {isNext && <ArrowRight className="size-3.5" />}
      </span>
      <span className="text-sm font-medium">{neighbour.title}</span>
    </Link>
  );
}

export function ContentArticle({ title, description, meta, toc = [], previous, next, children }: ContentArticleProps) {
  return (
    <div className="flex w-full gap-10 px-4 py-8 md:px-8">
      <article className="mx-auto w-full min-w-0 max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-2 text-lg text-muted-foreground">{description}</p>}
        {meta && <div className="mt-3 text-sm text-muted-foreground">{meta}</div>}
        <div className="content-prose mt-8">{children}</div>
        {(previous || next) && (
          <div className="mt-12 flex gap-4 border-t pt-6">
            {previous ? (
              <NeighbourLink
                neighbour={previous}
                direction="previous"
              />
            ) : (
              <div className="flex-1" />
            )}
            {next ? (
              <NeighbourLink
                neighbour={next}
                direction="next"
              />
            ) : (
              <div className="flex-1" />
            )}
          </div>
        )}
      </article>
      {toc.length > 0 && <Toc items={toc} />}
    </div>
  );
}
