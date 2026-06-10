import { User } from '@db/schema/auth-schema';
import { APIKey } from '@db/schema/schema';
import { eq } from 'drizzle-orm';

import { db } from './db';
import { isTransientDbError, transientDbErrorCode } from './dbErrors';

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
  // API-key DB queries — so transient DB errors return a structured
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

    if (apiKey === process.env.INTERNAL_SECRET) {
      const authUserId = request.headers.get('x-user-id');
      const [user] = await db
        .select()
        .from(User)
        .where(eq(User.id, authUserId || ''))
        .limit(1);
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

    const [key] = await db
      .select({
        userId: APIKey.userId,
        email: User.email,
      })
      .from(APIKey)
      .innerJoin(User, eq(APIKey.userId, User.id))
      .where(eq(APIKey.key, apiKey))
      .limit(1);
    if (!key) {
      return {
        success: false,
        error: 'KEY_EXPIRED',
      };
    }

    return {
      success: true,
      userId: key.userId,
      email: key.email,
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
