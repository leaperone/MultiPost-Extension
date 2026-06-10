import { defineConfig, defineDocs, frontmatterSchema, metaSchema } from 'fumadocs-mdx/config';
import rehypeExternalLinks from 'rehype-external-links';
import rehypeGithubAlert from 'rehype-github-alert';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import type { Pluggable } from 'unified';
// Use zod v4 for schema extension (fumadocs-mdx uses zod v4 internally)
import { z } from 'zod/v4';

const blogFrontmatter = frontmatterSchema.extend({
  keywords: z.string().optional(),
  date: z.date().optional(),
  author: z.string().optional(),
});

export const blog = defineDocs({
  dir: 'content/blog',
  docs: {
    schema: blogFrontmatter,
  },
  meta: {
    schema: metaSchema,
  },
});

export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: frontmatterSchema,
  },
  meta: {
    schema: metaSchema,
  },
});

export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      langs: ['bash', 'html', 'http', 'json', 'markdown', 'ts', 'typescript'],
    },
    remarkPlugins: (plugins) => [
      ...plugins,
      remarkGfm as Pluggable,
      remarkMath as Pluggable,
    ],
    rehypePlugins: (plugins) => [
      ...plugins,
      rehypeGithubAlert as Pluggable,
      rehypeKatex as Pluggable,
      rehypeHighlight as Pluggable,
      [
        rehypeExternalLinks,
        {
          target: '_blank',
          rel: ['noopener', 'noreferrer'],
        },
      ] as Pluggable,
    ],
  },
});
