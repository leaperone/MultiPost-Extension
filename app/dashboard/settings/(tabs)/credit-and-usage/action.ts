'use server';

import { auth } from '@/auth';
import { multipostDb } from '@/lib/db';
import { Decimal } from '@prisma/client/runtime/library';
import { nanoid } from 'nanoid';
import ky from 'ky';
import { dollarToYuan, RechargeStatus, RechargeType } from '@/actions/credit/types';

interface RechargeResponse {
  success: boolean;
  result?: string;
  error?: string;
}
/**
 * 创建充值订单
 * @param amount 充值金额
 * @param returnUrl 支付完成后的回调地址
 */
export async function recharge(amount: number, returnUrl: string): Promise<RechargeResponse> {
  try {
    // 验证用户登录状态
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Authentication failed',
      };
    }

    // 验证充值金额
    if (!amount || amount < 10) {
      return {
        success: false,
        error: 'Recharge amount must be greater than 10 US dollar',
      };
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

    const resp = await ky
      .post<{ success: boolean; result: string }>(`${process.env.TWOSOMEREN_BASE_URL}/api/internal/mp/recharge`, {
        json: {
          secret: process.env.INTERNAL_SECRET,
          orderId: recharge.orderId,
          amount: recharge.amount.mul(dollarToYuan).toString(),
          returnUrl,
        },
      })
      .json();

    return {
      success: resp.success,
      result: resp.result,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Recharge failed, please try again later',
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
