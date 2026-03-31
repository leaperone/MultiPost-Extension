import { multipostDb } from "@/lib/db";

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
}
