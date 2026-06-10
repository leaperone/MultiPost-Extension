import { createServerFn } from '@tanstack/react-start';
import { fromDecimal, toDecimal } from '@db/helpers';
import { Credit, CreditUsage, RechargeCredit } from '@db/schema/schema';
import Decimal from 'decimal.js';
import { desc, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { db } from '../../lib/db';
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

    const [credit] = await db
      .select()
      .from(Credit)
      .where(eq(Credit.userId, session.user.id))
      .limit(1);

    if (!credit) {
      return zeroCreditInfo();
    }

    const credits = toDecimal(credit.credits);
    const freeCredits = toDecimal(credit.freeCredits);

    return {
      credits: credits.toNumber(),
      freeCredits: freeCredits.toNumber(),
      totalCredits: credits.add(freeCredits).toNumber(),
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

    const usageHistory = await db
      .select()
      .from(CreditUsage)
      .where(eq(CreditUsage.userId, session.user.id))
      .orderBy(desc(CreditUsage.createdAt))
      .limit(50);

    return {
      success: true,
      data: usageHistory.map((usage) => ({
        id: usage.id,
        type: usage.type,
        amount: toDecimal(usage.amount).toNumber(),
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

      const amount = new Decimal(data.amount.toString());
      const [recharge] = await db
        .insert(RechargeCredit)
        .values({
          userId: session.user.id,
          orderId: `MP-${nanoid(32)}`,
          type: RechargeType.ALIPAY,
          amount: fromDecimal(amount),
          status: RechargeStatus.PENDING,
        })
        .returning();

      const resp = await requestAlipayUrl(recharge.orderId, amount, data.returnUrl);
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

      const amount = new Decimal(data.amount.toString());
      const [recharge] = await db
        .insert(RechargeCredit)
        .values({
          userId: session.user.id,
          orderId: `MP-${nanoid(32)}`,
          type: RechargeType.STRIPE,
          amount: fromDecimal(amount),
          status: RechargeStatus.PENDING,
        })
        .returning();

      const resp = await createStripeCheckoutSession(
        recharge.orderId,
        amount,
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
