import { RechargeStatus } from '@/actions/credit/types';
import { RechargeCredit } from '@db/schema/schema';
import { and, eq, ne } from 'drizzle-orm';

import { addCreditInTransaction } from '../../../../actions/credit/_core';
import { db } from '../../../../lib/db';

export type RechargeNotifyResult = 'success' | 'not_found';

export async function grantRechargeCredit(orderId: string): Promise<RechargeNotifyResult> {
  return db.transaction(async (tx) => {
    const [recharge] = await tx
      .update(RechargeCredit)
      .set({ status: RechargeStatus.SUCCESS })
      .where(and(eq(RechargeCredit.orderId, orderId), ne(RechargeCredit.status, RechargeStatus.SUCCESS)))
      .returning();

    if (!recharge) {
      const [existing] = await tx
        .select({ id: RechargeCredit.id })
        .from(RechargeCredit)
        .where(eq(RechargeCredit.orderId, orderId))
        .limit(1);

      if (!existing) {
        return 'not_found';
      }

      return 'success';
    }

    const result = await addCreditInTransaction(tx, recharge.userId, recharge.amount, false);
    if (!result.success) {
      throw new Error(result.error || 'Failed to grant recharge credit');
    }

    return 'success';
  });
}
