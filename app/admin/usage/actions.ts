'use server';

import { prisma } from '@/lib/db';
import { RespT } from '@/lib/request';
import { isAdmin } from '@/actions/admin';
import { auth } from '@/auth';
import { Decimal } from '@prisma/client/runtime/library';

export interface CreditUsage {
  id: string;
  userId: string;
  type: string;
  amount: Decimal;
  isFree: boolean;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

export interface GetCreditUsagesParams {
  cursor?: string;
  limit?: number;
  userId?: string;
  type?: string;
  email?: string;
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

export async function getCreditUsages({ cursor, limit = 20, userId, type, email }: GetCreditUsagesParams = {}): Promise<
  RespT<GetCreditUsagesResult>
> {
  const session = await auth();
  if (!session) {
    return { code: -1, msg: 'Please login', data: { creditUsages: [], count: 0 } };
  }
  if (!isAdmin(session.user.email?.toString() ?? '')) {
    return { code: -1, msg: 'You are not an admin', data: { creditUsages: [], count: 0 } };
  }

  const where: Record<string, unknown> = {};

  if (cursor) {
    where.id = { lt: cursor }; // id 递减分页
  }

  if (userId) {
    where.userId = userId;
  }

  if (type) {
    where.type = type;
  }

  if (email) {
    where.user = {
      email: {
        contains: email,
        mode: 'insensitive',
      },
    };
  }

  const creditUsages = (await prisma.creditUsage.findMany({
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
  })) as CreditUsage[];

  const count = await prisma.creditUsage.count({ where });
  const nextCursor = creditUsages.length === limit ? creditUsages[creditUsages.length - 1].id : undefined;

  return { code: 0, msg: 'success', data: { creditUsages, count, nextCursor } };
}

export async function getCreditUsageStats(): Promise<RespT<CreditUsageStats>> {
  const session = await auth();
  if (!session) {
    return { code: -1, msg: 'Please login', data: { totalUsage: 0, freeUsage: 0, paidUsage: 0, uniqueUsers: 0 } };
  }
  if (!isAdmin(session.user.email?.toString() ?? '')) {
    return {
      code: -1,
      msg: 'You are not an admin',
      data: { totalUsage: 0, freeUsage: 0, paidUsage: 0, uniqueUsers: 0 },
    };
  }

  // 获取总使用量
  const totalUsageResult = await prisma.creditUsage.aggregate({
    _sum: {
      amount: true,
    },
  });

  // 获取免费使用量
  const freeUsageResult = await prisma.creditUsage.aggregate({
    where: {
      isFree: true,
    },
    _sum: {
      amount: true,
    },
  });

  // 获取付费使用量
  const paidUsageResult = await prisma.creditUsage.aggregate({
    where: {
      isFree: false,
    },
    _sum: {
      amount: true,
    },
  });

  // 获取活跃用户数
  const uniqueUsersResult = await prisma.creditUsage.groupBy({
    by: ['userId'],
    _count: {
      userId: true,
    },
  });

  const totalUsage = parseFloat(totalUsageResult._sum.amount?.toString() || '0');
  const freeUsage = parseFloat(freeUsageResult._sum.amount?.toString() || '0');
  const paidUsage = parseFloat(paidUsageResult._sum.amount?.toString() || '0');
  const uniqueUsers = uniqueUsersResult.length;

  return {
    code: 0,
    msg: 'success',
    data: {
      totalUsage,
      freeUsage,
      paidUsage,
      uniqueUsers,
    },
  };
}
