import { blogSource } from '@/lib/blog-source';
import { blogI18n } from '@/lib/blog-i18n';
import {
  DocsPage,
  DocsBody,
  DocsDescription,
  DocsTitle,
} from 'fumadocs-ui/page';
import { notFound } from 'next/navigation';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { getMDXComponents } from '@/mdx-components';
import type { Metadata } from 'next';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ lang: string; slug?: string[] }>;
}

const texts = {
  en: {
    title: 'MultiPost Blog',
    description: 'Latest articles and updates from MultiPost',
    noBlogsMessage: 'No blog posts yet',
    by: 'By',
    on: 'on',
  },
  'zh-Hans': {
    title: 'MultiPost 博客',
    description: 'MultiPost 的最新文章和更新',
    noBlogsMessage: '暂时还没有博客文章',
    by: '作者',
    on: '发布于',
  },
  'zh-Hant': {
    title: 'MultiPost 部落格',
    description: 'MultiPost 的最新文章和更新',
    noBlogsMessage: '暫時還沒有部落格文章',
    by: '作者',
    on: '發布於',
  },
  ja: {
    title: 'MultiPost ブログ',
    description: 'MultiPostからの最新記事と更新',
    noBlogsMessage: 'まだブログ記事がありません',
    by: '著者',
    on: '投稿日',
  },
  fr: {
    title: 'Blog MultiPost',
    description: 'Derniers articles et mises à jour de MultiPost',
    noBlogsMessage: 'Aucun article de blog pour le moment',
    by: 'Par',
    on: 'le',
  },
  es: {
    title: 'Blog de MultiPost',
    description: 'Últimos artículos y actualizaciones de MultiPost',
    noBlogsMessage: 'Aún no hay publicaciones en el blog',
    by: 'Por',
    on: 'el',
  },
  pt: {
    title: 'Blog MultiPost',
    description: 'Últimos artigos e atualizações do MultiPost',
    noBlogsMessage: 'Ainda não há postagens no blog',
    by: 'Por',
    on: 'em',
  },
  ko: {
    title: 'MultiPost 블로그',
    description: 'MultiPost의 최신 기사 및 업데이트',
    noBlogsMessage: '아직 블로그 글이 없습니다',
    by: '작성자',
    on: '작성일',
  },
  ms: {
    title: 'Blog MultiPost',
    description: 'Artikel dan kemas kini terkini dari MultiPost',
    noBlogsMessage: 'Belum ada catatan blog lagi',
    by: 'Oleh',
    on: 'pada',
  },
  id: {
    title: 'Blog MultiPost',
    description: 'Artikel dan pembaruan terbaru dari MultiPost',
    noBlogsMessage: 'Belum ada postingan blog',
    by: 'Oleh',
    on: 'pada',
  },
  ru: {
    title: 'Блог MultiPost',
    description: 'Последние статьи и обновления от MultiPost',
    noBlogsMessage: 'Пока нет записей в блоге',
    by: 'Автор',
    on: 'опубликовано',
  },
} as const;

const languages = [
  { code: 'en', label: 'English' },
  { code: 'zh-Hans', label: '简体中文' },
  { code: 'zh-Hant', label: '繁體中文' },
  { code: 'ja', label: '日本語' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'pt', label: 'Português' },
  { code: 'ko', label: '한국어' },
  { code: 'ms', label: 'Melayu' },
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'ru', label: 'Русский' },
];

function BlogHomePage({ lang }: { lang: string }) {
  const typedLang = lang as keyof typeof texts;
  const allBlogs = blogSource.getPages(lang);

  const blogs = allBlogs.sort((a, b) => {
    const dateA = a.data.date;
    const dateB = b.data.date;

    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;

    return dateB.getTime() - dateA.getTime();
  });

  const t = texts[typedLang] || texts.en;

  return (
    <main className="flex flex-1 flex-col px-6 py-8">
      <div className="mx-auto w-full max-w-6xl">
        <nav className="mb-8 flex flex-wrap gap-2">
          {languages.map((item) => (
            <Link
              key={item.code}
              href={`/blog/${item.code}`}
              className={`rounded-md px-3 py-1 text-sm transition-colors ${
                lang === item.code
                  ? 'bg-fd-primary text-fd-primary-foreground'
                  : 'bg-fd-secondary text-fd-secondary-foreground hover:bg-fd-accent'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {blogs.length === 0 ? (
          <p className="text-fd-muted-foreground">{t.noBlogsMessage}</p>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 md:gap-12">
            {blogs.map((blog) => (
              <Link
                key={blog.url}
                href={blog.url}
                className="block space-y-3 border-b border-fd-border pb-8 last:border-b-0"
              >
                <article className="space-y-3">
                  <h2 className="text-2xl font-semibold text-fd-foreground transition-colors hover:text-fd-primary">
                    {blog.data.title ||
                      (lang === 'zh-Hans' ? '无标题' : 'Untitled')}
                  </h2>

                  {(blog.data.author || blog.data.date) && (
                    <div className="flex items-center gap-4 text-sm text-fd-muted-foreground">
                      {blog.data.author && (
                        <span className="flex items-center gap-1">
                          {t.by} {blog.data.author}
                        </span>
                      )}
                      {blog.data.date && (
                        <span className="flex items-center gap-1">
                          {t.on} {blog.data.date.toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  )}

                  {blog.data.description && (
                    <p className="leading-relaxed text-fd-muted-foreground">
                      {blog.data.description}
                    </p>
                  )}

                  {blog.data.keywords && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {blog.data.keywords
                        .split(',')
                        .slice(0, 5)
                        .map((keyword: string, index: number) => (
                          <span
                            key={index}
                            className="rounded-md bg-fd-secondary px-2 py-1 text-xs text-fd-secondary-foreground"
                          >
                            {keyword.trim()}
                          </span>
                        ))}
                      {blog.data.keywords.split(',').length > 5 && (
                        <span className="px-2 py-1 text-xs text-fd-muted-foreground">
                          +{blog.data.keywords.split(',').length - 5}
                        </span>
                      )}
                    </div>
                  )}
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default async function Page({ params }: PageProps) {
  const { lang, slug } = await params;

  // If no slug, show the blog home page with article list
  if (!slug || slug.length === 0) {
    return <BlogHomePage lang={lang} />;
  }

  const page = blogSource.getPage(slug, lang);

  if (!page) notFound();

  const MDXContent = page.data.body;

  const langPrefix = lang === 'en' ? '' : `/${lang}`;
  const url = `https://multipost.app${langPrefix}/blog/${slug?.join('/') || ''}`;
  const publishedTime = page.data.date
    ? new Date(page.data.date).toISOString()
    : new Date().toISOString();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: page.data.title,
    description: page.data.description,
    image: 'https://multipost.app/og-image.png',
    datePublished: publishedTime,
    dateModified: publishedTime,
    author: {
      '@type': 'Person',
      name: page.data.author || 'MultiPost Team',
    },
    publisher: {
      '@type': 'Organization',
      name: 'MultiPost',
      logo: {
        '@type': 'ImageObject',
        url: 'https://multipost.app/og-image.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <DocsPage toc={page.data.toc} full={page.data.full}>
        <DocsTitle>{page.data.title}</DocsTitle>
        <DocsDescription>{page.data.description}</DocsDescription>
        <DocsBody>
          <MDXContent
            components={getMDXComponents({
              a: createRelativeLink(blogSource, page),
            })}
          />
        </DocsBody>
      </DocsPage>
    </>
  );
}

export function generateStaticParams() {
  const articleParams = blogSource.generateParams();

  // Add root params for each language (blog home pages)
  const homeParams = blogI18n.languages.map((lang) => ({
    lang,
    slug: [],
  }));

  return [...homeParams, ...articleParams];
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { lang, slug } = await params;

  // Home page metadata
  if (!slug || slug.length === 0) {
    const typedLang = lang as keyof typeof texts;
    const t = texts[typedLang] || texts.en;

    return {
      title: t.title,
      description: t.description,
      openGraph: {
        type: 'website',
        locale: lang === 'zh-Hans' ? 'zh_CN' : 'en_US',
        url: `https://multipost.app/blog/${lang}`,
        title: t.title,
        description: t.description,
        siteName: 'MultiPost Blog',
      },
    };
  }

  const page = blogSource.getPage(slug, lang);

  if (!page) notFound();

  const langPrefix = lang === 'en' ? '' : `/${lang}`;
  const url = `https://multipost.app${langPrefix}/blog/${slug?.join('/') || ''}`;
  const publishedTime = page.data.date
    ? new Date(page.data.date).toISOString()
    : undefined;

  return {
    title: page.data.title,
    description: page.data.description,
    keywords: page.data.keywords,
    authors: page.data.author
      ? [{ name: page.data.author }]
      : [{ name: 'MultiPost Team' }],
    openGraph: {
      type: 'article',
      locale: lang === 'zh-Hans' ? 'zh_CN' : 'en_US',
      url: url,
      title: page.data.title,
      description: page.data.description,
      siteName: 'MultiPost Blog',
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: page.data.title,
        },
      ],
      publishedTime,
      authors: page.data.author ? [page.data.author] : ['MultiPost Team'],
    },
    twitter: {
      card: 'summary_large_image',
      title: page.data.title,
      description: page.data.description,
      images: ['/twitter-image.png'],
      creator: '@multipost_app',
    },
    alternates: {
      canonical: url,
    },
  };
}
