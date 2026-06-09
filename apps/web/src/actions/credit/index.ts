import { createServerFn } from '@tanstack/react-start';
import { Decimal } from '@prisma/client/runtime/library';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { multipostDb } from '../../lib/db';
import { requestAlipayUrl } from '@/lib/alipay';
import { createStripeCheckoutSession } from '@/lib/stripe';
import type { CreditInfo } from '@/actions/credit/types';
import { RechargeStatus, RechargeType } from '@/actions/credit/types';
import { getSession } from '../../lib/session';

interface RechargeResponse {
  success: boolean;
  result?: string;
  error?: string;
}

const zeroCreditInfo = (): CreditInfo => ({
  credits: 0,
  freeCredits: 0,
  totalCredits: 0,
});

const createRechargeSchema = (minAmount: number) =>
  z.object({
    amount: z.number().finite().positive().min(minAmount),
    returnUrl: z.string(),
  });

export const getUserSelfCredit = createServerFn({ method: 'GET' }).handler(
  async (): Promise<CreditInfo> => {
    const session = await getSession();
    if (!session?.user?.id) {
      throw new Error('Authentication failed');
    }

    const credit = await multipostDb.credit.findUnique({
      where: { userId: session.user.id },
    });

    if (!credit) {
      return zeroCreditInfo();
    }

    return {
      credits: Number(credit.credits),
      freeCredits: Number(credit.freeCredits),
      totalCredits: Number(credit.credits.add(credit.freeCredits)),
    };
  },
);

export const getCreditUsageHistory = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Authentication failed',
      };
    }

    const usageHistory = await multipostDb.creditUsage.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      success: true,
      data: usageHistory.map((usage) => ({
        id: usage.id,
        type: usage.type,
        amount: Number(usage.amount),
        isFree: usage.isFree,
        createdAt: usage.createdAt,
      })),
    };
  } catch {
    return {
      success: false,
      error: 'Failed to fetch credit usage history',
    };
  }
});

export const rechargeViaAlipay = createServerFn({ method: 'POST' })
  .validator(createRechargeSchema(1))
  .handler(async ({ data }): Promise<RechargeResponse> => {
    try {
      const session = await getSession();
      if (!session?.user?.id) {
        throw new Error('Authentication failed');
      }

      const recharge = await multipostDb.rechargeCredit.create({
        data: {
          userId: session.user.id,
          orderId: `MP-${nanoid(32)}`,
          type: RechargeType.ALIPAY,
          amount: new Decimal(data.amount.toString()),
          status: RechargeStatus.PENDING,
        },
      });

      const resp = await requestAlipayUrl(recharge.orderId, recharge.amount, data.returnUrl);
      const redirectUrl = resp.result || '';

      if (!redirectUrl) {
        throw new Error('Failed to create payment link, please try again later');
      }

      return {
        success: true,
        result: redirectUrl,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Recharge failed, please try again later',
      };
    }
  });

export const rechargeViaStripe = createServerFn({ method: 'POST' })
  .validator(createRechargeSchema(10))
  .handler(async ({ data }): Promise<RechargeResponse> => {
    try {
      const session = await getSession();
      if (!session?.user?.id) {
        throw new Error('Authentication failed');
      }

      const recharge = await multipostDb.rechargeCredit.create({
        data: {
          userId: session.user.id,
          orderId: `MP-${nanoid(32)}`,
          type: RechargeType.STRIPE,
          amount: new Decimal(data.amount.toString()),
          status: RechargeStatus.PENDING,
        },
      });

      const resp = await createStripeCheckoutSession(
        recharge.orderId,
        recharge.amount,
        data.returnUrl,
      );
      const redirectUrl = resp.result || '';

      if (!redirectUrl) {
        throw new Error('Failed to create payment link, please contact support');
      }

      return {
        success: true,
        result: redirectUrl,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Recharge failed, please try again later',
      };
    }
  });
