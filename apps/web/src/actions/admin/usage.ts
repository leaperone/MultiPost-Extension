import { createServerFn } from '@tanstack/react-start';
import { User } from '@db/schema/auth-schema';
import { CreditUsage as CreditUsageTable } from '@db/schema/schema';
import {
  and,
  count,
  countDistinct,
  desc,
  eq,
  ilike,
  lt,
  sum,
  type SQL,
} from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../../lib/db';
import type { RespT } from '../../lib/request';
import { getSession } from '../../lib/session';
import { isAdmin } from '../admin';

export interface CreditUsage {
  id: string;
  userId: string;
  type: string;
  amount: string;
  isFree: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

export interface GetCreditUsagesResult {
  creditUsages: CreditUsage[];
  count: number;
  nextCursor?: string;
}

export interface CreditUsageStats {
  totalUsage: number;
  freeUsage: number;
  paidUsage: number;
  uniqueUsers: number;
}

const getCreditUsagesSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
  userId: z.string().optional(),
  type: z.string().optional(),
  email: z.string().optional(),
});

const emptySchema = z.object({});

async function requireAdmin() {
  const session = await getSession();
  if (!session?.user?.id || !session.user.email) return null;
  if (!isAdmin(session.user.email)) return null;
  return session;
}

function unauthorized<T>(data: T): RespT<T> {
  return { code: -1, msg: 'You are not an admin', data };
}

function andAll(conditions: (SQL | undefined)[]) {
  const filtered = conditions.filter((condition): condition is SQL => Boolean(condition));
  return filtered.length > 0 ? and(...filtered) : undefined;
}

function creditUsageWhere(data: z.infer<typeof getCreditUsagesSchema>) {
  return andAll([
    data.cursor ? lt(CreditUsageTable.id, data.cursor) : undefined,
    data.userId ? eq(CreditUsageTable.userId, data.userId) : undefined,
    data.type ? eq(CreditUsageTable.type, data.type) : undefined,
    data.email ? ilike(User.email, `%${data.email}%`) : undefined,
  ]);
}

function sumToNumber(value: string | null | undefined) {
  return Number(value ?? 0);
}

export const getCreditUsages = createServerFn({ method: 'GET' })
  .validator(getCreditUsagesSchema)
  .handler(async ({ data }): Promise<RespT<GetCreditUsagesResult>> => {
    const session = await requireAdmin();
    if (!session) return unauthorized({ creditUsages: [], count: 0 });

    const limit = data.limit ?? 20;
    const where = creditUsageWhere(data);

    const [creditUsages, countRows] = await Promise.all([
      db
        .select({
          id: CreditUsageTable.id,
          userId: CreditUsageTable.userId,
          type: CreditUsageTable.type,
          amount: CreditUsageTable.amount,
          isFree: CreditUsageTable.isFree,
          createdAt: CreditUsageTable.createdAt,
          updatedAt: CreditUsageTable.updatedAt,
          user: {
            id: User.id,
            name: User.name,
            email: User.email,
            image: User.image,
          },
        })
        .from(CreditUsageTable)
        .innerJoin(User, eq(CreditUsageTable.userId, User.id))
        .where(where)
        .orderBy(desc(CreditUsageTable.createdAt))
        .limit(limit),
      db
        .select({ count: count() })
        .from(CreditUsageTable)
        .innerJoin(User, eq(CreditUsageTable.userId, User.id))
        .where(where),
    ]);

    return {
      code: 0,
      msg: 'success',
      data: {
        creditUsages: creditUsages.map((usage) => ({
          id: usage.id,
          userId: usage.userId,
          type: usage.type,
          amount: usage.amount,
          isFree: usage.isFree,
          createdAt: usage.createdAt.toISOString(),
          updatedAt: usage.updatedAt.toISOString(),
          user: usage.user,
        })),
        count: countRows[0]?.count ?? 0,
        nextCursor: creditUsages.length === limit ? creditUsages[creditUsages.length - 1]?.id : undefined,
      },
    };
  });

export const getCreditUsageStats = createServerFn({ method: 'GET' })
  .validator(emptySchema)
  .handler(async (): Promise<RespT<CreditUsageStats>> => {
    const session = await requireAdmin();
    const empty = { totalUsage: 0, freeUsage: 0, paidUsage: 0, uniqueUsers: 0 };
    if (!session) return unauthorized(empty);

    const [totalUsageResult, freeUsageResult, paidUsageResult, uniqueUsersResult] =
      await Promise.all([
        db.select({ amount: sum(CreditUsageTable.amount) }).from(CreditUsageTable),
        db
          .select({ amount: sum(CreditUsageTable.amount) })
          .from(CreditUsageTable)
          .where(eq(CreditUsageTable.isFree, true)),
        db
          .select({ amount: sum(CreditUsageTable.amount) })
          .from(CreditUsageTable)
          .where(eq(CreditUsageTable.isFree, false)),
        db.select({ count: countDistinct(CreditUsageTable.userId) }).from(CreditUsageTable),
      ]);

    return {
      code: 0,
      msg: 'success',
      data: {
        totalUsage: sumToNumber(totalUsageResult[0]?.amount),
        freeUsage: sumToNumber(freeUsageResult[0]?.amount),
        paidUsage: sumToNumber(paidUsageResult[0]?.amount),
        uniqueUsers: uniqueUsersResult[0]?.count ?? 0,
      },
    };
  });
