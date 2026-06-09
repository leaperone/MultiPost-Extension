import { RechargeStatus } from '@/actions/credit/types';

import { addCreditInTransaction } from '../../../../actions/credit/_core';
import { multipostDb } from '../../../../lib/db';

export type RechargeNotifyResult = 'success' | 'not_found';

export async function grantRechargeCredit(orderId: string): Promise<RechargeNotifyResult> {
  return multipostDb.$transaction(async (tx) => {
    const recharge = await tx.rechargeCredit.findUnique({
      where: { orderId },
    });

    if (!recharge) {
      return 'not_found';
    }

    if (recharge.status === RechargeStatus.SUCCESS) {
      return 'success';
    }

    const updated = await tx.rechargeCredit.updateMany({
      where: {
        orderId,
        status: { not: RechargeStatus.SUCCESS },
      },
      data: { status: RechargeStatus.SUCCESS },
    });

    if (updated.count === 0) {
      return 'success';
    }

    const result = await addCreditInTransaction(tx, recharge.userId, recharge.amount, false);
    if (!result.success) {
      throw new Error(result.error || 'Failed to grant recharge credit');
    }

    return 'success';
  });
}
