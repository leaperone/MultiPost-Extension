'use server';

import { auth } from '@/auth';
import { multipostDb } from '@/lib/db';
import { Decimal } from '@prisma/client/runtime/library';
import { nanoid } from 'nanoid';
import { RechargeStatus, RechargeType } from '@/actions/credit/types';
import { requestAlipayUrl } from '@/lib/alipay';
import { createStripeCheckoutSession } from '@/lib/stripe';

interface RechargeResponse {
  success: boolean;
  result?: string;
  error?: string;
}
/**
 * 创建充值订单
 * @param amount 充值金额
 * @param returnUrl 支付完成后的回调地址
 * @param payType 支付方式：alipay或stripe
 */
export async function recharge(
  amount: number,
  returnUrl: string,
  payType: 'alipay' | 'stripe' = 'alipay',
): Promise<RechargeResponse> {
  try {
    // 验证用户登录状态
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error('Authentication failed');
    }

    // 根据支付方式确定最低充值金额
    const minAmount = payType === 'alipay' ? 1 : 10;
    const currency = 'USD'; // 假设货币单位为美元

    // 验证充值金额
    if (!amount || amount < minAmount) {
      throw new Error(`Recharge amount must be greater than or equal to ${minAmount} ${currency} for ${payType}`);
    }

    // 确定支付类型
    const type = payType === 'stripe' ? RechargeType.STRIPE : RechargeType.ALIPAY;

    // 创建充值记录
    const recharge = await multipostDb.rechargeCredit.create({
      data: {
        userId: session.user.id,
        orderId: `MP-${nanoid(32)}`,
        type,
        amount: new Decimal(amount.toString()),
        status: RechargeStatus.PENDING,
      },
    });

    // 获取支付链接
    let redirectUrl = '';

    if (type === RechargeType.ALIPAY) {
      const resp = await requestAlipayUrl(recharge.orderId, recharge.amount, returnUrl);
      redirectUrl = resp.result || '';
    } else if (type === RechargeType.STRIPE) {
      const resp = await createStripeCheckoutSession(recharge.orderId, recharge.amount, returnUrl);
      redirectUrl = resp.success ? resp.result || '' : '';
    }

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
