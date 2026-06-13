'use client';

import { Check, CircleCheck, CircleX, Copy, Info, TriangleAlert } from 'lucide-react';
import { useRef, useState } from 'react';
import type { AnchorHTMLAttributes, ComponentProps, DetailedHTMLProps, FC, ReactNode } from 'react';

export type AnchorComponent = FC<
  DetailedHTMLProps<AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>
>;

function createHeading<Tag extends 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'>(Tag: Tag) {
  return function Heading({ id, children, ...props }: ComponentProps<Tag>) {
    if (!id) {
      // @ts-expect-error -- heading props are forwarded verbatim per tag
      return <Tag {...props}>{children}</Tag>;
    }

    return (
      // @ts-expect-error -- heading props are forwarded verbatim per tag
      <Tag
        id={id}
        className="group scroll-mt-24"
        {...props}>
        {children}
        <a
          href={`#${id}`}
          aria-label="Link to section"
          className="ml-2 align-middle text-muted-foreground no-underline opacity-0 transition-opacity group-hover:opacity-100">
          #
        </a>
      </Tag>
    );
  };
}

function Pre({ children, ...props }: ComponentProps<'pre'>) {
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = preRef.current?.textContent;
    if (!text) return;
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="group relative">
      <pre
        ref={preRef}
        {...props}>
        {children}
      </pre>
      <button
        type="button"
        aria-label="Copy code"
        onClick={handleCopy}
        className="absolute right-2 top-2 rounded-md border bg-background/80 p-1.5 text-muted-foreground opacity-0 backdrop-blur-sm transition-opacity hover:text-foreground group-hover:opacity-100">
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  );
}

function Img(props: ComponentProps<'img'>) {
  return (
    <img
      loading="lazy"
      className="rounded-lg border"
      {...props}
    />
  );
}

function Table(props: ComponentProps<'table'>) {
  return (
    <div className="overflow-x-auto">
      <table {...props} />
    </div>
  );
}

interface CardProps {
  title: ReactNode;
  description?: ReactNode;
  href?: string;
  icon?: ReactNode;
  children?: ReactNode;
}

export function Card({ title, description, href, icon, children }: CardProps) {
  const body = (
    <>
      <p className="flex items-center gap-2 font-medium text-foreground">
        {icon}
        {title}
      </p>
      {(description ?? children) && (
        <div className="mt-1.5 text-sm text-muted-foreground">{description ?? children}</div>
      )}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className="block rounded-lg border p-4 no-underline transition-colors hover:bg-muted">
        {body}
      </a>
    );
  }

  return <div className="rounded-lg border p-4">{body}</div>;
}

export function Cards({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
}

const calloutIcons = {
  info: Info,
  warn: TriangleAlert,
  warning: TriangleAlert,
  error: CircleX,
  success: CircleCheck,
} as const;

interface CalloutProps {
  type?: keyof typeof calloutIcons;
  title?: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
}

export function Callout({ type = 'info', title, icon, children }: CalloutProps) {
  const Icon = calloutIcons[type] ?? Info;

  return (
    <div className="my-4 flex gap-3 rounded-lg border bg-muted/40 p-4 text-sm">
      <span className="mt-0.5 shrink-0 text-muted-foreground">
        {icon ?? <Icon className="size-4" />}
      </span>
      <div className="min-w-0 flex-1 [&>:first-child]:mt-0 [&>:last-child]:mb-0">
        {title && <p className="mb-1 font-medium text-foreground">{title}</p>}
        {children}
      </div>
    </div>
  );
}

const baseComponents = {
  h1: createHeading('h1'),
  h2: createHeading('h2'),
  h3: createHeading('h3'),
  h4: createHeading('h4'),
  h5: createHeading('h5'),
  h6: createHeading('h6'),
  pre: Pre,
  img: Img,
  table: Table,
  Callout,
  Card,
  Cards,
};

export type MDXComponents = typeof baseComponents & {
  a?: AnchorComponent;
};

export function getMDXComponents(components?: { a?: AnchorComponent }): MDXComponents {
  return {
    ...baseComponents,
    ...components,
  };
}
