import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { FC, DetailedHTMLProps, AnchorHTMLAttributes } from 'react';

type AnchorComponent = FC<
  DetailedHTMLProps<AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>
>;

type MDXComponents = typeof defaultMdxComponents & {
  a?: AnchorComponent;
};

export function getMDXComponents(components?: { a?: AnchorComponent }): MDXComponents {
  return {
    ...defaultMdxComponents,
    ...components,
  };
}
