'use server';

import { prisma } from '@/lib/db';
import { RespT } from '@/lib/request';
import { isAdmin } from '@/actions/admin';
import { auth } from '@/auth';
import { User } from '../users/actions';

export interface SearchUserParams {
  id?: string;
  email?: string;
}

/**
 * Search user by id or email
 * @description 精确查找单个用户（id 或 email）
 * @param {SearchUserParams} params - 查询参数
 * @returns {Promise<RespT<User | null>>} 用户信息或 null
 */
export async function searchUser({ id, email }: SearchUserParams): Promise<RespT<User | null>> {
  const session = await auth();
  if (!session) {
    return { code: -1, msg: 'Please login', data: null };
  }
  if (!isAdmin(session.user.email?.toString() ?? '')) {
    return { code: -1, msg: 'You are not an admin', data: null };
  }
  if (!id && !email) {
    return { code: -1, msg: 'id or email required', data: null };
  }
  let user: User | null = null;
  if (id) {
    user = (await prisma.user.findUnique({ where: { id } })) as User | null;
  }
  if (!user && email) {
    user = (await prisma.user.findUnique({ where: { email } })) as User | null;
  }
  return { code: 0, msg: 'success', data: user };
}

export async function getUserCreditBalance(userId: string): Promise<
  RespT<{
    credits: number;
    freeCredits: number;
  }>
> {
  const session = await auth();
  if (!session) {
    return { code: -1, msg: 'Please login', data: { credits: 0, freeCredits: 0 } };
  }
  if (!isAdmin(session.user.email?.toString() ?? '')) {
    return { code: -1, msg: 'You are not an admin', data: { credits: 0, freeCredits: 0 } };
  }

  const credit = await prisma.credit.findUnique({
    where: { userId },
  });

  return {
    code: 0,
    msg: 'success',
    data: {
      credits: credit?.credits?.toNumber() ?? 0,
      freeCredits: credit?.freeCredits?.toNumber() ?? 0,
    },
  };
}
