import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { multipostDb } from '../../lib/db';
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

export const getCreditUsages = createServerFn({ method: 'GET' })
  .validator(getCreditUsagesSchema)
  .handler(async ({ data }): Promise<RespT<GetCreditUsagesResult>> => {
    const session = await requireAdmin();
    if (!session) return unauthorized({ creditUsages: [], count: 0 });

    const limit = data.limit ?? 20;
    const where: {
      id?: { lt: string };
      userId?: string;
      type?: string;
      user?: { email: { contains: string; mode: 'insensitive' } };
    } = {};

    if (data.cursor) where.id = { lt: data.cursor };
    if (data.userId) where.userId = data.userId;
    if (data.type) where.type = data.type;
    if (data.email) {
      where.user = {
        email: {
          contains: data.email,
          mode: 'insensitive',
        },
      };
    }

    const [creditUsages, count] = await Promise.all([
      multipostDb.creditUsage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      }),
      multipostDb.creditUsage.count({ where }),
    ]);

    return {
      code: 0,
      msg: 'success',
      data: {
        creditUsages: creditUsages.map((usage) => ({
          id: usage.id,
          userId: usage.userId,
          type: usage.type,
          amount: usage.amount.toString(),
          isFree: usage.isFree,
          createdAt: usage.createdAt.toISOString(),
          updatedAt: usage.updatedAt.toISOString(),
          user: usage.user,
        })),
        count,
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
        multipostDb.creditUsage.aggregate({ _sum: { amount: true } }),
        multipostDb.creditUsage.aggregate({
          where: { isFree: true },
          _sum: { amount: true },
        }),
        multipostDb.creditUsage.aggregate({
          where: { isFree: false },
          _sum: { amount: true },
        }),
        multipostDb.creditUsage.groupBy({
          by: ['userId'],
          _count: { userId: true },
        }),
      ]);

    return {
      code: 0,
      msg: 'success',
      data: {
        totalUsage: Number(totalUsageResult._sum.amount ?? 0),
        freeUsage: Number(freeUsageResult._sum.amount ?? 0),
        paidUsage: Number(paidUsageResult._sum.amount ?? 0),
        uniqueUsers: uniqueUsersResult.length,
      },
    };
  });
