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
    subtitle: 'Tips, tutorials, and insights for content creators',
    description: 'Learn how to maximize your social media reach with multi-platform publishing strategies, tool comparisons, and creator success stories.',
    noBlogsMessage: 'New articles coming soon. Stay tuned!',
    by: 'By',
    on: 'on',
    readMore: 'Read article',
  },
  'zh-Hans': {
    title: 'MultiPost 博客',
    subtitle: '内容创作者的效率指南',
    description: '多平台发布技巧、工具对比评测、创作者成长策略，助你提升内容影响力。',
    noBlogsMessage: '精彩内容即将上线，敬请期待！',
    by: '作者',
    on: '发布于',
    readMore: '阅读全文',
  },
  'zh-Hant': {
    title: 'MultiPost 部落格',
    subtitle: '內容創作者的效率指南',
    description: '多平台發布技巧、工具對比評測、創作者成長策略，助你提升內容影響力。',
    noBlogsMessage: '精彩內容即將上線，敬請期待！',
    by: '作者',
    on: '發布於',
    readMore: '閱讀全文',
  },
  ja: {
    title: 'MultiPost ブログ',
    subtitle: 'コンテンツクリエイターのための効率ガイド',
    description: 'マルチプラットフォーム配信のコツ、ツール比較、クリエイター成功事例をお届けします。',
    noBlogsMessage: '新しい記事を準備中です。お楽しみに！',
    by: '著者',
    on: '投稿日',
    readMore: '続きを読む',
  },
  fr: {
    title: 'Blog MultiPost',
    subtitle: 'Guide d\'efficacité pour les créateurs de contenu',
    description: 'Conseils de publication multiplateforme, comparaisons d\'outils et stratégies de croissance pour les créateurs.',
    noBlogsMessage: 'De nouveaux articles arrivent bientôt. Restez connecté !',
    by: 'Par',
    on: 'le',
    readMore: 'Lire l\'article',
  },
  es: {
    title: 'Blog de MultiPost',
    subtitle: 'Guía de eficiencia para creadores de contenido',
    description: 'Consejos de publicación multiplataforma, comparaciones de herramientas y estrategias de crecimiento para creadores.',
    noBlogsMessage: '¡Nuevos artículos próximamente. Mantente atento!',
    by: 'Por',
    on: 'el',
    readMore: 'Leer artículo',
  },
  pt: {
    title: 'Blog MultiPost',
    subtitle: 'Guia de eficiência para criadores de conteúdo',
    description: 'Dicas de publicação multiplataforma, comparações de ferramentas e estratégias de crescimento para criadores.',
    noBlogsMessage: 'Novos artigos em breve. Fique ligado!',
    by: 'Por',
    on: 'em',
    readMore: 'Ler artigo',
  },
  ko: {
    title: 'MultiPost 블로그',
    subtitle: '콘텐츠 크리에이터를 위한 효율 가이드',
    description: '멀티플랫폼 게시 팁, 도구 비교, 크리에이터 성장 전략을 제공합니다.',
    noBlogsMessage: '새로운 글이 곧 올라옵니다. 기대해 주세요!',
    by: '작성자',
    on: '작성일',
    readMore: '더 읽기',
  },
  ms: {
    title: 'Blog MultiPost',
    subtitle: 'Panduan kecekapan untuk pencipta kandungan',
    description: 'Tips penerbitan berbilang platform, perbandingan alat, dan strategi pertumbuhan untuk pencipta.',
    noBlogsMessage: 'Artikel baharu akan datang tidak lama lagi. Nantikan!',
    by: 'Oleh',
    on: 'pada',
    readMore: 'Baca artikel',
  },
  id: {
    title: 'Blog MultiPost',
    subtitle: 'Panduan efisiensi untuk kreator konten',
    description: 'Tips publikasi multi-platform, perbandingan alat, dan strategi pertumbuhan untuk kreator.',
    noBlogsMessage: 'Artikel baru segera hadir. Nantikan!',
    by: 'Oleh',
    on: 'pada',
    readMore: 'Baca artikel',
  },
  ru: {
    title: 'Блог MultiPost',
    subtitle: 'Руководство по эффективности для создателей контента',
    description: 'Советы по мультиплатформенной публикации, сравнения инструментов и стратегии роста для создателей.',
    noBlogsMessage: 'Новые статьи скоро появятся. Следите за обновлениями!',
    by: 'Автор',
    on: 'опубликовано',
    readMore: 'Читать статью',
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
    <main className="flex flex-1 flex-col px-6 py-12">
      <div className="mx-auto w-full max-w-6xl">
        {/* Hero Section */}
        <header className="mb-12 text-center">
          <h1 className="mb-3 text-4xl font-bold tracking-tight text-fd-foreground md:text-5xl">
            {t.title}
          </h1>
          <p className="mb-4 text-xl text-fd-muted-foreground">
            {t.subtitle}
          </p>
          <p className="mx-auto max-w-2xl text-fd-muted-foreground">
            {t.description}
          </p>
        </header>

        {/* Language Selector */}
        <nav className="mb-10 flex flex-wrap justify-center gap-2">
          {languages.map((item) => (
            <Link
              key={item.code}
              href={`/blog/${item.code}`}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                lang === item.code
                  ? 'bg-fd-primary text-fd-primary-foreground'
                  : 'bg-fd-secondary text-fd-secondary-foreground hover:bg-fd-accent'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Blog List */}
        {blogs.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-lg text-fd-muted-foreground">{t.noBlogsMessage}</p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:gap-10">
            {blogs.map((blog) => (
              <Link
                key={blog.url}
                href={blog.url}
                className="group block rounded-xl border border-fd-border p-6 transition-all hover:border-fd-primary/50 hover:shadow-lg"
              >
                <article className="space-y-4">
                  <h2 className="text-xl font-semibold text-fd-foreground transition-colors group-hover:text-fd-primary">
                    {blog.data.title ||
                      (lang === 'zh-Hans' ? '无标题' : 'Untitled')}
                  </h2>

                  {blog.data.description && (
                    <p className="line-clamp-2 text-fd-muted-foreground">
                      {blog.data.description}
                    </p>
                  )}

                  {blog.data.keywords && (
                    <div className="flex flex-wrap gap-2">
                      {blog.data.keywords
                        .split(',')
                        .slice(0, 3)
                        .map((keyword: string, index: number) => (
                          <span
                            key={index}
                            className="rounded-full bg-fd-secondary px-2.5 py-0.5 text-xs text-fd-secondary-foreground"
                          >
                            {keyword.trim()}
                          </span>
                        ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    {(blog.data.author || blog.data.date) && (
                      <div className="flex items-center gap-3 text-sm text-fd-muted-foreground">
                        {blog.data.date && (
                          <span>{blog.data.date.toLocaleDateString()}</span>
                        )}
                        {blog.data.author && (
                          <span>· {blog.data.author}</span>
                        )}
                      </div>
                    )}
                    <span className="text-sm font-medium text-fd-primary opacity-0 transition-opacity group-hover:opacity-100">
                      {t.readMore} →
                    </span>
                  </div>
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
