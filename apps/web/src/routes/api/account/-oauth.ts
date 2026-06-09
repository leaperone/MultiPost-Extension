import type { AppSession } from '../../../lib/session';

const SETTINGS_PATH = '/dashboard/settings/social-media-accounts';

export async function requireOAuthSession(request: Request): Promise<
  | {
      session: AppSession;
      response: null;
    }
  | {
      session: null;
      response: Response;
    }
> {
  if (!request.headers.get('cookie')) {
    return {
      session: null,
      response: redirectToApp(request, '/signin'),
    };
  }

  const { getSessionFromRequest } = await import('../../../lib/session');
  const session = await getSessionFromRequest(request);
  if (!session?.user?.id) {
    return {
      session: null,
      response: redirectToApp(request, '/signin'),
    };
  }

  return {
    session,
    response: null,
  };
}

export function redirectToSettings(request: Request, search: string) {
  return redirectToApp(request, `${SETTINGS_PATH}${search}`);
}

export function redirectToApp(request: Request, path: string) {
  // In production require APP_URL so redirects never trust a client-controlled
  // Host/origin. Only fall back to the request origin in development.
  const appUrl =
    process.env.APP_URL ||
    (process.env.NODE_ENV === 'production' ? undefined : new URL(request.url).origin);
  if (!appUrl) {
    throw new Error('APP_URL must be configured in production for OAuth redirects');
  }
  return Response.redirect(new URL(`${appUrl}${path}`, request.url));
}
