import { createFileRoute } from '@tanstack/react-router';

const baseUrl = 'https://multipost.app';
const disallow = ['/dashboard/', '/admin/', '/api/', '/auth/', '/on-install'];

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: async () =>
        new Response(renderRobots(), {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
        }),
    },
  },
});

function renderRobots() {
  return [
    renderRule('*'),
    renderRule('Googlebot'),
    renderRule('Baiduspider'),
    `Sitemap: ${baseUrl}/sitemap.xml`,
    '',
  ].join('\n');
}

function renderRule(userAgent: string) {
  return [`User-agent: ${userAgent}`, 'Allow: /', ...disallow.map((path) => `Disallow: ${path}`), ''].join('\n');
}
