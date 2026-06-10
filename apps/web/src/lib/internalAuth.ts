import { User } from '@db/schema/auth-schema';
import { APIKey } from '@db/schema/schema';
import { eq } from 'drizzle-orm';

import { db } from './db';

export async function authInternalRequest(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return {
      success: false,
    };
  }
  const secret = authHeader.split(' ')[1];
  if (!secret || secret !== process.env.INTERNAL_SECRET) {
    return {
      success: false,
    };
  }

  const apiKeyHeader = request.headers.get('x-api-key');
  if (!apiKeyHeader) {
    return {
      success: false,
      error: 'UNAUTHORIZED',
    };
  }
  const apiKey = apiKeyHeader.split(' ')[1];
  if (!apiKey) {
    return {
      success: false,
      error: 'UNAUTHORIZED',
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
}
