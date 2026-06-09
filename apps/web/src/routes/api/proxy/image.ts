import { createFileRoute } from '@tanstack/react-router';

const ALLOWED_DOMAINS = ['2some.ren', '2some.one', 'leaper.one', 'seedeai.com', 'seede.ai'];

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_DOMAINS.some(
      (domain) => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`),
    );
  } catch {
    return false;
  }
}

export const Route = createFileRoute('/api/proxy/image')({
  server: {
    handlers: {
      GET,
    },
  },
});

async function GET({ request }: { request: Request }) {
  const url = new URL(request.url).searchParams.get('url');

  if (!url) {
    return Response.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  if (!isAllowedUrl(url)) {
    return Response.json({ error: 'URL domain not allowed' }, { status: 403 });
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return Response.json({ error: 'Failed to fetch image' }, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    if (!contentType.startsWith('image/')) {
      return Response.json({ error: 'URL does not point to an image' }, { status: 400 });
    }

    const buffer = await response.arrayBuffer();

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Proxy image error:', error);
    return Response.json({ error: 'Failed to proxy image' }, { status: 500 });
  }
}
