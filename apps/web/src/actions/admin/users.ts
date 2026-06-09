import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { multipostDb } from '../../lib/db';
import { getSession } from '../../lib/session';
import { isAdmin } from '../admin';
import type { RespT } from '../../lib/request';

export interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt: string;
}

export interface GetUsersResult {
  users: AdminUser[];
  count: number;
  nextCursor?: string;
}

const getUsersSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

const searchUserSchema = z.object({
  id: z.string().optional(),
  email: z.string().email().optional(),
});

const userIdSchema = z.object({
  userId: z.string(),
});

async function requireAdmin() {
  const session = await getSession();
  if (!session?.user?.id || !session.user.email) return null;
  if (!isAdmin(session.user.email)) return null;
  return session;
}

function unauthorized<T>(data: T): RespT<T> {
  return { code: -1, msg: 'You are not an admin', data };
}

function serializeUser(user: {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt: Date;
}): AdminUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    createdAt: user.createdAt.toISOString(),
  };
}

export const getUsers = createServerFn({ method: 'GET' })
  .validator(getUsersSchema)
  .handler(async ({ data }): Promise<RespT<GetUsersResult>> => {
    const session = await requireAdmin();
    if (!session) return unauthorized({ users: [], count: 0 });

    const limit = data.limit ?? 20;
    const where = data.cursor ? { id: { lt: data.cursor } } : {};

    const [users, count] = await Promise.all([
      multipostDb.user.findMany({
        where,
        orderBy: { id: 'desc' },
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          createdAt: true,
        },
      }),
      multipostDb.user.count(),
    ]);

    return {
      code: 0,
      msg: 'success',
      data: {
        users: users.map(serializeUser),
        count,
        nextCursor: users.length === limit ? users[users.length - 1]?.id : undefined,
      },
    };
  });

export const searchUser = createServerFn({ method: 'GET' })
  .validator(searchUserSchema)
  .handler(async ({ data }): Promise<RespT<AdminUser | null>> => {
    const session = await requireAdmin();
    if (!session) return unauthorized(null);
    if (!data.id && !data.email) return { code: -1, msg: 'id or email required', data: null };

    const user = data.id
      ? await multipostDb.user.findUnique({
          where: { id: data.id },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true,
          },
        })
      : null;

    const fallbackUser =
      user || !data.email
        ? user
        : await multipostDb.user.findUnique({
            where: { email: data.email },
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              createdAt: true,
            },
          });

    return {
      code: 0,
      msg: 'success',
      data: fallbackUser ? serializeUser(fallbackUser) : null,
    };
  });

export const getUserCreditBalance = createServerFn({ method: 'GET' })
  .validator(userIdSchema)
  .handler(async ({ data }): Promise<RespT<{ credits: number; freeCredits: number }>> => {
    const session = await requireAdmin();
    if (!session) return unauthorized({ credits: 0, freeCredits: 0 });

    const credit = await multipostDb.credit.findUnique({
      where: { userId: data.userId },
    });

    return {
      code: 0,
      msg: 'success',
      data: {
        credits: credit?.credits?.toNumber() ?? 0,
        freeCredits: credit?.freeCredits?.toNumber() ?? 0,
      },
    };
  });
