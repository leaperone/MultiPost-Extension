import { createFileRoute } from '@tanstack/react-router';
import { APIKey } from '@db/schema/schema';
import { desc, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { preflightResponse, withCors } from '../../lib/cors';
import { db } from '../../lib/db';

const createApiKeySchema = z.object({
  name: z.string().min(1, '名称不能为空').max(100, '名称不能超过100个字符'),
});

function maskApiKey(key: string): string {
  if (!key) return '';
  const start = key.slice(0, 8);
  const end = key.slice(-8);
  return `${start}********************${end}`;
}

export const Route = createFileRoute('/api/api-keys')({
  server: {
    handlers: {
      OPTIONS: async () => preflightResponse(),
      GET,
      POST,
    },
  },
});

async function GET({ request }: { request: Request }) {
  try {
    if (!request.headers.get('cookie')) {
      return withCors(new Response('Unauthorized', { status: 401 }));
    }

    const { getSessionFromRequest } = await import('../../lib/session');
    const session = await getSessionFromRequest(request);
    if (!session?.user?.id) {
      return withCors(new Response('Unauthorized', { status: 401 }));
    }

    const apiKeys = await db
      .select()
      .from(APIKey)
      .where(eq(APIKey.userId, session.user.id))
      .orderBy(desc(APIKey.createdAt));

    const maskedApiKeys = apiKeys.map((key) => ({
      ...key,
      key: maskApiKey(key.key),
    }));

    return withCors(Response.json(maskedApiKeys));
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return withCors(new Response('Internal Server Error', { status: 500 }));
  }
}

async function POST({ request }: { request: Request }) {
  try {
    if (!request.headers.get('cookie')) {
      return withCors(new Response('Unauthorized', { status: 401 }));
    }

    const { getSessionFromRequest } = await import('../../lib/session');
    const session = await getSessionFromRequest(request);
    if (!session?.user?.id) {
      return withCors(new Response('Unauthorized', { status: 401 }));
    }

    const body = await request.json();
    const { name } = createApiKeySchema.parse(body);

    const [newApiKey] = await db
      .insert(APIKey)
      .values({
        userId: session.user.id,
        name,
        key: `sk-${nanoid(32)}`,
      })
      .returning();

    return withCors(Response.json(newApiKey));
  } catch (error) {
    console.error('Error creating API key:', error);
    if (error instanceof z.ZodError) {
      return withCors(new Response(error.issues[0].message, { status: 400 }));
    }
    return withCors(new Response('Internal Server Error', { status: 500 }));
  }
}
