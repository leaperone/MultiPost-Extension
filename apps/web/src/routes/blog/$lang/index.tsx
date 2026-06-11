import { createServerFn } from '@tanstack/react-start';
import { createFileRoute, Link } from '@tanstack/react-router';
import { z } from 'zod';

import { blogLanguages, getBlogText } from '../../../lib/blog-copy';
import { resolveBlogLang } from '../../../lib/blog-i18n';
import type { BlogListItem } from '../../../lib/blog-source';
import { SITE_URL } from '../../../lib/seo';

const blogListSchema = z.object({
  lang: z.string().min(1),
});

const loadBlogList = createServerFn({ method: 'GET' })
  .validator(blogListSchema)
  .handler(async ({ data }) => {
    const { getBlogListData } = await import('../../../lib/blog-source');
    return getBlogListData(data.lang);
  });

export const Route = createFileRoute('/blog/$lang/')({
  loader: ({ params }) => loadBlogList({ data: { lang: resolveBlogLang(params.lang) } }),
  head: ({ params }) => {
    const lang = resolveBlogLang(params.lang);
    const text = getBlogText(lang);

    return {
      meta: [
        { title: text.title },
        { name: 'description', content: text.description },
        { property: 'og:type', content: 'website' },
        {
          property: 'og:locale',
          content: lang === 'zh-Hans' ? 'zh_CN' : 'en_US',
        },
        { property: 'og:url', content: `${SITE_URL}/blog/${lang}` },
        { property: 'og:title', content: text.title },
        { property: 'og:description', content: text.description },
        { property: 'og:site_name', content: 'MultiPost Blog' },
      ],
      links: [{ rel: 'canonical', href: `${SITE_URL}/blog/${lang}` }],
    };
  },
  component: BlogHomePage,
});

function BlogHomePage() {
  const { lang: routeLang } = Route.useParams();
  const lang = resolveBlogLang(routeLang);
  const blogs = Route.useLoaderData();
  const text = getBlogText(lang);

  return (
    <main className="flex flex-1 flex-col px-6 py-12">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-12 text-center">
          <h1 className="mb-3 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            {text.title}
          </h1>
          <p className="mb-4 text-xl text-muted-foreground">{text.subtitle}</p>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            {text.description}
          </p>
        </header>

        <nav className="mb-10 flex flex-wrap justify-center gap-2">
          {blogLanguages.map((item) => (
            <Link
              key={item.code}
              to="/blog/$lang"
              params={{ lang: item.code }}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                lang === item.code
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}>
              {item.label}
            </Link>
          ))}
        </nav>

        {blogs.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-lg text-muted-foreground">{text.noBlogsMessage}</p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:gap-10">
            {blogs.map((blog) => (
              <BlogCard
                key={blog.url}
                blog={blog}
                fallbackTitle={text.untitled}
                readMore={text.readMore}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function BlogCard({
  blog,
  fallbackTitle,
  readMore,
}: {
  blog: BlogListItem;
  fallbackTitle: string;
  readMore: string;
}) {
  return (
    <Link
      to={blog.url}
      className="group block rounded-xl border border-border p-6 transition-all hover:bg-muted">
      <article className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground transition-colors group-hover:underline">
          {blog.title || fallbackTitle}
        </h2>

        {blog.description ? (
          <p className="line-clamp-2 text-muted-foreground">{blog.description}</p>
        ) : null}

        {blog.keywords ? (
          <div className="flex flex-wrap gap-2">
            {blog.keywords
              .split(',')
              .slice(0, 3)
              .map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                  {keyword.trim()}
                </span>
              ))}
          </div>
        ) : null}

        <div className="flex items-center justify-between pt-2">
          {blog.author || blog.date ? (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {blog.date ? <span>{new Date(blog.date).toLocaleDateString()}</span> : null}
              {blog.author ? <span>{blog.author}</span> : null}
            </div>
          ) : null}
          <span className="text-sm font-medium text-foreground opacity-0 transition-opacity group-hover:opacity-100">
            {readMore} →
          </span>
        </div>
      </article>
    </Link>
  );
}
