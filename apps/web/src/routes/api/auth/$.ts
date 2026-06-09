import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: handleAuthRequest,
      POST: handleAuthRequest,
    },
  },
});

async function handleAuthRequest({ request }: { request: Request }) {
  // Keep Prisma-backed Better Auth out of the public route graph until an auth request is handled.
  const { auth } = await import('../../../lib/auth');
  return auth.handler(request);
}
