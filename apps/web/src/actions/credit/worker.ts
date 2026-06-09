import type { UsageType } from '@/actions/credit/types';
import { Decimal } from '@prisma/client/runtime/library';

import { deductCredit } from './_core';

export async function deductCreditWorker(userId: string, type: UsageType, amount: Decimal) {
  return deductCredit({ userId, type, amount });
}
