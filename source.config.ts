import {
  defineConfig,
  defineDocs,
  frontmatterSchema,
  metaSchema,
} from 'fumadocs-mdx/config';
import { z } from 'zod';

// @ts-expect-error - Type instantiation is excessively deep
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
  mdxOptions: {},
});
