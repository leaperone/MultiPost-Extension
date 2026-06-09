import { createServerFn } from '@tanstack/react-start';
import { Decimal } from '@prisma/client/runtime/library';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { multipostDb } from '../../lib/db';
import { getSession } from '../../lib/session';
import { isAdmin } from '../admin';
import { RechargeStatus, RechargeType } from '../credit/types';

const rechargeSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  amount: z.number().positive('金额必须为正数'),
});

const emptySchema = z.object({});

export interface RechargeRecord {
  id: string;
  orderId: string;
  type: string;
  amount: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: {
    email: string;
    name: string | null;
  };
}

async function requireAdmin() {
  const session = await getSession();
  if (!session?.user?.id || !session.user.email) return null;
  if (!isAdmin(session.user.email)) return null;
  return session;
}

export const adminRecharge = createServerFn({ method: 'POST' })
  .validator(rechargeSchema)
  .handler(async ({ data }) => {
    const session = await requireAdmin();
    if (!session) {
      return { success: false, message: '您不是管理员' };
    }

    try {
      const user = await multipostDb.user.findUnique({
        where: { email: data.email },
        include: { Credit: true },
      });

      if (!user) {
        return { success: false, message: '用户不存在' };
      }

      const amount = new Decimal(data.amount.toString());

      await multipostDb.$transaction(async (tx) => {
        await tx.rechargeCredit.create({
          data: {
            userId: user.id,
            orderId: `MP-${nanoid(32)}`,
            type: RechargeType.ADMIN,
            amount,
            status: RechargeStatus.SUCCESS,
          },
        });

        await tx.credit.upsert({
          where: { userId: user.id },
          update: {
            freeCredits: { increment: amount },
          },
          create: {
            userId: user.id,
            credits: new Decimal(0),
            freeCredits: amount,
          },
        });
      });

      return { success: true, message: '充值成功' };
    } catch (error) {
      console.error('Admin recharge failed:', error);
      return { success: false, message: '充值失败，请稍后再试' };
    }
  });

export const getRechargeHistory = createServerFn({ method: 'GET' })
  .validator(emptySchema)
  .handler(async (): Promise<{ success: boolean; message?: string; data?: RechargeRecord[] }> => {
    const session = await requireAdmin();
    if (!session) {
      return { success: false, message: '您不是管理员', data: [] };
    }

    try {
      const recharges = await multipostDb.rechargeCredit.findMany({
        include: {
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        success: true,
        data: recharges.map((recharge) => ({
          id: recharge.id,
          orderId: recharge.orderId,
          type: recharge.type,
          amount: recharge.amount.toString(),
          status: recharge.status,
          createdAt: recharge.createdAt.toISOString(),
          updatedAt: recharge.updatedAt.toISOString(),
          user: recharge.user,
        })),
      };
    } catch (error) {
      console.error('Failed to get recharge history:', error);
      return { success: false, message: '获取充值记录失败', data: [] };
    }
  });
