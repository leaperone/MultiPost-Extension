import { createFileRoute } from '@tanstack/react-router';

import { authKey } from '../../../lib/authKey';
import { preflightResponse, withCors } from '../../../lib/cors';
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
    const { prisma } = await import('../../../lib/db');
    const client = await prisma.extensionClient.findUnique({
      where: {
        id: clientId,
        userId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        platformInfos: true,
        deletedAt: true,
      },
    });
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
    const { prisma } = await import('../../../lib/db');
    const body = await request.json();
    const { clientId, name } = body;
    const updatedClient = await prisma.extensionClient.update({
      where: {
        id: clientId,
        userId,
      },
      data: {
        name,
      },
    });
    return withCors(successResponse(updatedClient));
  } catch (error) {
    return withCors(errorResponse(error));
  }
}
