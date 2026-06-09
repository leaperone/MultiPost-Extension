import { createFileRoute } from '@tanstack/react-router';

import { preflightResponse, withCors } from '../../../lib/cors';

export const Route = createFileRoute('/api/api-keys/$id')({
  server: {
    handlers: {
      OPTIONS: async () => preflightResponse(),
      DELETE,
    },
  },
});

async function DELETE({ request, params }: { request: Request; params: { id: string } }) {
  const id = params.id;

  try {
    if (!request.headers.get('cookie')) {
      return withCors(new Response('Unauthorized', { status: 401 }));
    }

    const { getSessionFromRequest } = await import('../../../lib/session');
    const session = await getSessionFromRequest(request);
    if (!session?.user?.id) {
      return withCors(new Response('Unauthorized', { status: 401 }));
    }

    const { prisma } = await import('../../../lib/db');
    // Ensure users can only delete their own API key.
    const apiKey = await prisma.aPIKey.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
    });

    if (!apiKey) {
      return withCors(new Response('Not Found', { status: 404 }));
    }

    await prisma.aPIKey.delete({
      where: {
        id: id,
      },
    });

    return withCors(new Response(null, { status: 204 }));
  } catch (error) {
    console.error('Error deleting API key:', error);
    return withCors(new Response('Internal Server Error', { status: 500 }));
  }
}
