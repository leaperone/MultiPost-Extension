import type { DecimalInput } from '@db/helpers';
import type { UsageType } from '@/actions/credit/types';

import { deductCredit } from './_core';

export async function deductCreditWorker(userId: string, type: UsageType, amount: DecimalInput) {
  return deductCredit({ userId, type, amount });
}
