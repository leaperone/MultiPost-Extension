import { createFileRoute } from '@tanstack/react-router';
import { ExtensionClient } from '@db/schema/schema';
import { and, eq, isNull } from 'drizzle-orm';

import { authKey } from '../../../lib/authKey';
import { preflightResponse, withCors } from '../../../lib/cors';
import { db } from '../../../lib/db';
import { errorResponse, successResponse, unauthenticatedResponse } from '../../../lib/response';

export const Route = createFileRoute('/api/extension/client')({
  server: {
    handlers: {
      OPTIONS: async () => preflightResponse(),
      GET,
      PUT,
    },
  },
});

async function GET({ request }: { request: Request }) {
  const { userId } = await authKey(request);
  if (!userId) {
    return withCors(unauthenticatedResponse());
  }

  const searchParams = new URL(request.url).searchParams;
  const clientId = searchParams.get('clientId');
  if (!clientId) {
    throw new Error('CLIENT_ID_REQUIRED');
  }

  try {
    const [client] = await db
      .select({
        id: ExtensionClient.id,
        name: ExtensionClient.name,
        createdAt: ExtensionClient.createdAt,
        updatedAt: ExtensionClient.updatedAt,
        platformInfos: ExtensionClient.platformInfos,
        deletedAt: ExtensionClient.deletedAt,
      })
      .from(ExtensionClient)
      .where(
        and(
          eq(ExtensionClient.id, clientId),
          eq(ExtensionClient.userId, userId),
          isNull(ExtensionClient.deletedAt),
        ),
      )
      .limit(1);
    if (!client) {
      throw new Error('CLIENT_NOT_FOUND');
    }
    return withCors(successResponse(client));
  } catch (error) {
    return withCors(errorResponse(error));
  }
}

async function PUT({ request }: { request: Request }) {
  const { userId } = await authKey(request);
  if (!userId) {
    return withCors(unauthenticatedResponse());
  }

  try {
    const body = await request.json();
    const { clientId, name } = body;
    const [updatedClient] = await db
      .update(ExtensionClient)
      .set({
        name,
        updatedAt: new Date(),
      })
      .where(and(eq(ExtensionClient.id, clientId), eq(ExtensionClient.userId, userId)))
      .returning();
    return withCors(successResponse(updatedClient));
  } catch (error) {
    return withCors(errorResponse(error));
  }
}
