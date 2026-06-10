import { createServerFn } from '@tanstack/react-start';
import { User } from '@db/schema/auth-schema';
import { Credit } from '@db/schema/schema';
import { toDecimal } from '@db/helpers';
import { desc, eq, lt } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../../lib/db';
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
    const where = data.cursor ? lt(User.id, data.cursor) : undefined;

    const [users, countRows] = await Promise.all([
      db
        .select({
          id: User.id,
          name: User.name,
          email: User.email,
          image: User.image,
          createdAt: User.createdAt,
        })
        .from(User)
        .where(where)
        .orderBy(desc(User.id))
        .limit(limit),
      db.$count(User),
    ]);

    return {
      code: 0,
      msg: 'success',
      data: {
        users: users.map(serializeUser),
        count: countRows,
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

    const selectUser = {
      id: User.id,
      name: User.name,
      email: User.email,
      image: User.image,
      createdAt: User.createdAt,
    };

    const user = data.id
      ? (
          await db
            .select(selectUser)
            .from(User)
            .where(eq(User.id, data.id))
            .limit(1)
        )[0] ?? null
      : null;

    const fallbackUser =
      user || !data.email
        ? user
        : (
            await db
              .select(selectUser)
              .from(User)
              .where(eq(User.email, data.email))
              .limit(1)
          )[0] ?? null;

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

    const [credit] = await db
      .select()
      .from(Credit)
      .where(eq(Credit.userId, data.userId))
      .limit(1);

    return {
      code: 0,
      msg: 'success',
      data: {
        credits: toDecimal(credit?.credits)?.toNumber() ?? 0,
        freeCredits: toDecimal(credit?.freeCredits)?.toNumber() ?? 0,
      },
    };
  });
