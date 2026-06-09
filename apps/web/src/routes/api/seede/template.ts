import { createFileRoute } from '@tanstack/react-router';

const TEMPLATE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type TemplateCacheEntry = {
  expiresAt: number;
  data: unknown;
};

const templateCache = new Map<string, TemplateCacheEntry>();

const responseHeaders = {
  'Cache-Control': 'public, max-age=86400',
};

export const Route = createFileRoute('/api/seede/template')({
  server: {
    handlers: {
      GET,
    },
  },
});

async function GET({ request }: { request: Request }) {
  const url = new URL(request.url);
  const tag = url.searchParams.get('tag') || 'poster';
  const now = Date.now();
  const cached = templateCache.get(tag);

  if (cached && cached.expiresAt > now) {
    return Response.json({ success: true, data: cached.data }, { headers: responseHeaders });
  }

  try {
    const response = await fetch(`https://api.seede.ai/shared/template/tag/${tag}`, {
      headers: {
        authorization: process.env.SEEDE_API_TOKEN!,
        'content-type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch templates');
    }

    const data = await response.json();
    templateCache.set(tag, {
      data,
      expiresAt: now + TEMPLATE_CACHE_TTL_MS,
    });

    return Response.json({ success: true, data }, { headers: responseHeaders });
  } catch (error) {
    console.error(error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '获取模板失败',
      },
      { status: 500 },
    );
  }
}
