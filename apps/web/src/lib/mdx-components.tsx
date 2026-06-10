import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { AnchorHTMLAttributes, DetailedHTMLProps, FC } from 'react';

export type AnchorComponent = FC<
  DetailedHTMLProps<AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>
>;

export type MDXComponents = typeof defaultMdxComponents & {
  a?: AnchorComponent;
};

export function getMDXComponents(components?: { a?: AnchorComponent }): MDXComponents {
  return {
    ...defaultMdxComponents,
    ...components,
  };
}
