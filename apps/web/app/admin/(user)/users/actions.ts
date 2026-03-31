'use server';

import { prisma } from '@/lib/db';
import { RespT } from '@/lib/request';
import { isAdmin } from '@/actions/admin';
import { auth } from '@/auth';

export interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt: Date;
}

export interface GetUsersParams {
  cursor?: string;
  limit?: number;
}

export interface GetUsersResult {
  users: User[];
  count: number;
  nextCursor?: string;
}

export async function getUsers({ cursor, limit = 20 }: GetUsersParams = {}): Promise<RespT<GetUsersResult>> {
  const session = await auth();
  if (!session) {
    return { code: -1, msg: 'Please login', data: { users: [], count: 0 } };
  }
  if (!isAdmin(session.user.email?.toString() ?? '')) {
    return { code: -1, msg: 'You are not an admin', data: { users: [], count: 0 } };
  }

  const where = cursor
    ? { id: { lt: cursor } } // id 递减分页
    : {};

  const users = (await prisma.user.findMany({
    where,
    orderBy: { id: 'desc' },
    take: limit,
  })) as User[];

  const count = await prisma.user.count();
  const nextCursor = users.length === limit ? users[users.length - 1].id : undefined;

  return { code: 0, msg: 'success', data: { users, count, nextCursor } };
}
