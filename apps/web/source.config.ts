import { defineConfig, defineDocs, frontmatterSchema, metaSchema } from 'fumadocs-mdx/config';
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
  mdxOptions: {},
});
