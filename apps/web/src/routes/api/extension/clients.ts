import { createFileRoute } from '@tanstack/react-router';

import { authKey } from '../../../lib/authKey';
import { preflightResponse, withCors } from '../../../lib/cors';
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
    const { prisma } = await import('../../../lib/db');
    const clients = await prisma.extensionClient.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return withCors(successResponse(clients));
  } catch (error) {
    return withCors(errorResponse(error));
  }
}
