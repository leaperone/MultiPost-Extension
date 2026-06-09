import { createFileRoute } from '@tanstack/react-router';

const baseUrl = 'https://multipost.app';
const blogLanguages = ['en', 'zh-Hans', 'zh-Hant', 'ja', 'fr', 'es', 'pt', 'ko', 'ms', 'id', 'ru'];
const docsLanguages = ['en', 'zh'];

type SitemapEntry = {
  url: string;
  lastModified: Date;
  changeFrequency: 'daily' | 'weekly' | 'monthly';
  priority: number;
};

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () =>
        new Response(renderSitemap(), {
          headers: {
            'content-type': 'application/xml; charset=utf-8',
          },
        }),
    },
  },
});

function renderSitemap() {
  const currentDate = new Date();
  const staticPages: SitemapEntry[] = [
    { url: baseUrl, lastModified: currentDate, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/extension`, lastModified: currentDate, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/about`, lastModified: currentDate, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/signin`, lastModified: currentDate, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/dashboard`, lastModified: currentDate, changeFrequency: 'daily', priority: 0.7 },
    { url: `${baseUrl}/dashboard/publish`, lastModified: currentDate, changeFrequency: 'daily', priority: 0.7 },
    { url: `${baseUrl}/dashboard/publish/dynamic`, lastModified: currentDate, changeFrequency: 'daily', priority: 0.7 },
    { url: `${baseUrl}/dashboard/publish/video`, lastModified: currentDate, changeFrequency: 'daily', priority: 0.7 },
    { url: `${baseUrl}/dashboard/publish/podcast`, lastModified: currentDate, changeFrequency: 'daily', priority: 0.7 },
    { url: `${baseUrl}/dashboard/draw`, lastModified: currentDate, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${baseUrl}/dashboard/draw/image`, lastModified: currentDate, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${baseUrl}/dashboard/draw/poster`, lastModified: currentDate, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${baseUrl}/dashboard/drafts`, lastModified: currentDate, changeFrequency: 'daily', priority: 0.6 },
    { url: `${baseUrl}/dashboard/video-transcribe`, lastModified: currentDate, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${baseUrl}/legal/privacy`, lastModified: currentDate, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/legal/terms`, lastModified: currentDate, changeFrequency: 'monthly', priority: 0.5 },
  ];

  const blogPages: SitemapEntry[] = blogLanguages.map((lang) => ({
    url: `${baseUrl}/blog/${lang}`,
    lastModified: currentDate,
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  const docsPages: SitemapEntry[] = docsLanguages.map((lang) => ({
    url: `${baseUrl}/docs/${lang}/user-guide`,
    lastModified: currentDate,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const entries = [...staticPages, ...blogPages, ...docsPages];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(renderEntry).join('\n')}
</urlset>`;
}

function renderEntry(entry: SitemapEntry) {
  return `  <url>
    <loc>${escapeXml(entry.url)}</loc>
    <lastmod>${entry.lastModified.toISOString()}</lastmod>
    <changefreq>${entry.changeFrequency}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
