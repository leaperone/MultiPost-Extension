// Prisma transient connection error codes (https://www.prisma.io/docs/orm/reference/error-reference).
const TRANSIENT_DB_ERROR_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017']);

function isTransientDbError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string' &&
    TRANSIENT_DB_ERROR_CODES.has((error as { code: string }).code)
  );
}

function transientDbErrorCode(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string'
  ) {
    return (error as { code: string }).code;
  }

  return undefined;
}

/**
 * Validate a request using the same shape as the old Next.js authKey action.
 *
 * Supports:
 * 1. Better Auth session cookies from the passed Request
 * 2. API keys via Authorization: Bearer sk-...
 * 3. Internal auth via Authorization: Bearer INTERNAL_SECRET and x-user-id
 */
export async function authKey(request: Request) {
  // Wrap the whole flow — both session lookup (which also hits the DB) and the
  // API-key Prisma queries — so transient DB errors return a structured
  // DB_UNAVAILABLE instead of bubbling to Sentry (issue #258).
  try {
    const authHeader = request.headers.get('Authorization');
    const hasSessionCookie = !!request.headers.get('cookie');

    if (hasSessionCookie) {
      const { getSessionFromRequest } = await import('./session');
      const session = await getSessionFromRequest(request);
      if (session?.user) {
        return {
          success: true,
          userId: session.user.id,
          email: session.user.email,
        };
      }
    }

    if (!authHeader) {
      return {
        success: false,
        error: 'UNAUTHORIZED',
      };
    }
    const apiKey = authHeader.split(' ')[1];
    if (!apiKey) {
      return {
        success: false,
        error: 'UNAUTHORIZED',
      };
    }

    const { multipostDb } = await import('./db');

    if (apiKey === process.env.INTERNAL_SECRET) {
      const authUserId = request.headers.get('x-user-id');
      const user = await multipostDb.user.findUnique({
        where: {
          id: authUserId || '',
        },
      });
      if (!user) {
        return {
          success: false,
          error: 'UNAUTHORIZED',
        };
      }
      return {
        success: true,
        userId: user.id,
        email: user.email,
      };
    }

    const key = await multipostDb.aPIKey.findUnique({
      where: {
        key: apiKey,
      },
      select: {
        userId: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    });
    if (!key) {
      return {
        success: false,
        error: 'KEY_EXPIRED',
      };
    }

    return {
      success: true,
      userId: key.userId,
      email: key.user.email,
    };
  } catch (error) {
    if (isTransientDbError(error)) {
      console.warn('authKey: DB unavailable', transientDbErrorCode(error));
      return {
        success: false,
        error: 'DB_UNAVAILABLE',
      };
    }
    // Re-throw genuine bugs so they still reach Sentry.
    throw error;
  }
}
