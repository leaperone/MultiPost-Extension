import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://multipost.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/admin/', '/api/', '/auth/', '/blog', '/docs', '/on-install'],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/dashboard/', '/admin/', '/api/', '/auth/', '/blog', '/docs', '/on-install'],
      },
      {
        userAgent: 'Baiduspider',
        allow: '/',
        disallow: ['/dashboard/', '/admin/', '/api/', '/auth/', '/blog', '/docs', '/on-install'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
