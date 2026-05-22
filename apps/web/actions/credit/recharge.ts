'use server'; // 全新，未投入使用

import { auth } from '@/auth';
import { multipostDb } from '@/lib/db';
import { Decimal } from '@prisma/client/runtime/library';
import { nanoid } from 'nanoid';
import { requestAlipayUrl } from '@/lib/alipay';
import { createStripeCheckoutSession } from '@/lib/stripe';

type RechargeType = 'alipay' | 'stripe' | 'admin' | 'promotion' | 'signup';
const RechargeType: Record<string, RechargeType> = {
  ALIPAY: 'alipay',
  STRIPE: 'stripe',
  ADMIN: 'admin',
  PROMOTION: 'promotion',
  SIGNUP: 'signup',
} as const;

type RechargeStatusT = 'pending' | 'success';
const RechargeStatus: Record<string, RechargeStatusT> = {
  PENDING: 'pending',
  SUCCESS: 'success',
} as const;

interface RechargeResponse {
  success: boolean;
  result?: string;
  error?: string;
}
/**
 * 创建充值订单
 * @param amount 充值金额, USD
 * @param returnUrl 支付完成后的回调地址
 * @param payType 支付方式：alipay或stripe
 */
export async function rechargeViaAlipay(amount: number, returnUrl: string): Promise<RechargeResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error('Authentication failed');
    }

    const minAmount = 1;
    const currency = 'USD';

    if (!amount || amount < minAmount) {
      throw new Error(`Recharge amount must be greater than or equal to ${minAmount} ${currency} for alipay`);
    }

    // 创建充值记录
    const recharge = await multipostDb.rechargeCredit.create({
      data: {
        userId: session.user.id,
        orderId: `MP-${nanoid(32)}`,
        type: RechargeType.ALIPAY,
        amount: new Decimal(amount.toString()),
        status: RechargeStatus.PENDING,
      },
    });

    // 获取支付链接
    const resp = await requestAlipayUrl(recharge.orderId, recharge.amount, returnUrl);
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
}

export async function rechargeViaStripe(amount: number, returnUrl: string): Promise<RechargeResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error('Authentication failed');
    }

    const minAmount = 10;
    const currency = 'USD';

    if (!amount || amount < minAmount) {
      throw new Error(`Recharge amount must be greater than or equal to ${minAmount} ${currency} for stripe`);
    }

    // 创建充值记录
    const recharge = await multipostDb.rechargeCredit.create({
      data: {
        userId: session.user.id,
        orderId: `MP-${nanoid(32)}`,
        type: RechargeType.STRIPE,
        amount: new Decimal(amount.toString()),
        status: RechargeStatus.PENDING,
      },
    });

    // 获取支付链接
    const resp = await createStripeCheckoutSession(recharge.orderId, recharge.amount, returnUrl);
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
}

/**
 * 获取用户的信用使用记录
 */
export async function getCreditUsageHistory() {
  try {
    const session = await auth();
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
  } catch (error) {
    return {
      success: false,
      error: 'Failed to fetch credit usage history',
    };
  }
}
