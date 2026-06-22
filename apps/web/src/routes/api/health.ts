import { createFileRoute } from '@tanstack/react-router';

/**
 * Liveness probe for the web server container.
 *
 * Intentionally dependency-free: it must NOT touch the database, auth, or any
 * downstream service, so a healthy Node process always answers 200 even when a
 * dependency is degraded. This keeps Docker healthchecks scoped to "the HTTP
 * server is up and serving", not "every backend is reachable".
 */
export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: () =>
        Response.json(
          { status: 'ok', service: 'multipost-web', timestamp: new Date().toISOString() },
          { headers: { 'Cache-Control': 'no-store' } },
        ),
      HEAD: () => new Response(null, { status: 200, headers: { 'Cache-Control': 'no-store' } }),
    },
  },
});
