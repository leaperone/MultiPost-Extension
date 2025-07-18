'use server';

import { auth } from '@/auth';
import { multipostDb } from '@/lib/db';

/**
 * 验证用户身份
 *
 * 支持两种验证方式：
 * 1. 通过 session 验证（适用于网页端）
 * 2. 通过 API Key 验证（适用于 API 调用）
 * 3. Internal Auth（MultiPost 内部调用）
 *
 * @param request - 请求对象
 * @returns 验证结果，包含用户 ID 和邮箱
 *
 * 返回格式：
 * {
 *   success: boolean;    // 是否验证成功
 *   userId?: string;     // 用户 ID
 *   email?: string;      // 用户邮箱
 *   error?: string;      // 错误信息（验证失败时）
 * }
 */

export async function authKey(request: Request) {
  const session = await auth();
  if (session?.user) {
    return {
      success: true,
      userId: session.user.id,
      email: session.user.email,
    };
  }

  const authHeader = request.headers.get('Authorization');
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
}
