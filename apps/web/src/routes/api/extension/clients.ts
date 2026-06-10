import { createFileRoute } from '@tanstack/react-router';
import { ExtensionClient } from '@db/schema/schema';
import { and, eq, isNull } from 'drizzle-orm';

import { authKey } from '../../../lib/authKey';
import { preflightResponse, withCors } from '../../../lib/cors';
import { db } from '../../../lib/db';
import { errorResponse, successResponse, unauthenticatedResponse } from '../../../lib/response';

export const Route = createFileRoute('/api/extension/clients')({
  server: {
    handlers: {
      OPTIONS: async () => preflightResponse(),
      GET,
    },
  },
});

async function GET({ request }: { request: Request }) {
  const { userId } = await authKey(request);
  if (!userId) {
    return withCors(unauthenticatedResponse());
  }

  try {
    const clients = await db
      .select({
        id: ExtensionClient.id,
        name: ExtensionClient.name,
        createdAt: ExtensionClient.createdAt,
        updatedAt: ExtensionClient.updatedAt,
      })
      .from(ExtensionClient)
      .where(and(eq(ExtensionClient.userId, userId), isNull(ExtensionClient.deletedAt)));
    return withCors(successResponse(clients));
  } catch (error) {
    return withCors(errorResponse(error));
  }
}
