// SERVER-INTERNAL ONLY. Never expose as a client-callable server function. Callers must authorize the userId themselves.

import type {
  BatchDeductCreditParams,
  BatchDeductCreditResult,
  CreditInfo,
  DeductCreditParams,
  DeductCreditResult,
} from '@/actions/credit/types';
import { Decimal } from '@prisma/client/runtime/library';

import { multipostDb } from '../../lib/db';

type CreditWriteClient = Pick<typeof multipostDb, 'credit'>;

function assertPositiveFiniteDecimal(amount: Decimal.Value): Decimal {
  const decimal = new Decimal(amount);

  if (!decimal.isFinite() || !decimal.greaterThan(0)) {
    throw new Error('Amount must be finite and greater than 0');
  }

  return decimal;
}

export async function getCreditInfo(userId: string): Promise<CreditInfo> {
  let credit = await multipostDb.credit.findUnique({
    where: { userId },
  });

  if (!credit) {
    credit = await multipostDb.credit.create({
      data: {
        userId,
        credits: new Decimal(0),
        freeCredits: new Decimal(0),
      },
    });
  }

  return {
    credits: Number(credit.credits),
    freeCredits: Number(credit.freeCredits),
    totalCredits: Number(credit.credits.add(credit.freeCredits)),
  };
}

export async function getCredit(userId: string): Promise<CreditInfo> {
  return getCreditInfo(userId);
}

export async function preCheckCredit(userId: string, amount = 0.1): Promise<boolean> {
  const credit = await getCreditInfo(userId);
  return credit.totalCredits >= amount;
}

export async function deductCredit(params: DeductCreditParams): Promise<DeductCreditResult> {
  const { userId, type } = params;
  const amount = assertPositiveFiniteDecimal(params.amount);

  try {
    return await multipostDb.$transaction(async (tx) => {
      const credit = await tx.credit.findUnique({
        where: { userId },
      });

      if (!credit) {
        return {
          success: false,
          error: 'Insufficient credits',
        };
      }

      const totalCredits = Decimal.add(credit.credits, credit.freeCredits);
      if (totalCredits < amount) {
        return {
          success: false,
          error: 'Insufficient credits',
        };
      }

      const remainingAmount = new Decimal(amount);
      const freeCreditsToUse = Decimal.min(credit.freeCredits, remainingAmount);
      const paidCreditsToUse = remainingAmount.sub(freeCreditsToUse);

      const updatedCredit = await tx.credit.update({
        where: { userId },
        data: {
          freeCredits: credit.freeCredits.sub(freeCreditsToUse),
          credits: credit.credits.sub(paidCreditsToUse),
        },
      });

      if (freeCreditsToUse.greaterThan(0)) {
        await tx.creditUsage.create({
          data: {
            userId,
            type,
            amount: freeCreditsToUse,
            isFree: true,
          },
        });
      }

      if (paidCreditsToUse.greaterThan(0)) {
        await tx.creditUsage.create({
          data: {
            userId,
            type,
            amount: paidCreditsToUse,
            isFree: false,
          },
        });
      }

      return {
        success: true,
        remainingCredits: {
          credits: Number(updatedCredit.credits),
          freeCredits: Number(updatedCredit.freeCredits),
          totalCredits: Number(updatedCredit.credits.add(updatedCredit.freeCredits)),
        },
        usage: {
          credits: Number(amount),
        },
      };
    });
  } catch (error) {
    return {
      success: false,
      error: `${(error as Error).message}`,
    };
  }
}

async function addCreditWithClient(
  client: CreditWriteClient,
  userId: string,
  amount: Decimal,
  isFree: boolean,
) {
  const amountToAdd = assertPositiveFiniteDecimal(amount);

  try {
    const creditToAdd = isFree ? new Decimal(0) : amountToAdd;
    const freeCreditToAdd = isFree ? amountToAdd : new Decimal(0);

    // Use atomic increments so concurrent successful grants (e.g. webhook
    // retries / simultaneous recharges) cannot lose updates via read-modify-write.
    const updatedCredit = await client.credit.upsert({
      where: { userId },
      update: {
        credits: { increment: creditToAdd },
        freeCredits: { increment: freeCreditToAdd },
      },
      create: {
        userId,
        credits: creditToAdd,
        freeCredits: freeCreditToAdd,
      },
    });
    return {
      success: true,
      remainingCredits: {
        credits: Number(updatedCredit.credits),
        freeCredits: Number(updatedCredit.freeCredits),
        totalCredits: Number(updatedCredit.credits.add(updatedCredit.freeCredits)),
      },
    };
  } catch (error) {
    return { success: false, error: `${(error as Error).message}` };
  }
}

export async function addCredit(userId: string, amount: Decimal, isFree: boolean) {
  return addCreditWithClient(multipostDb, userId, amount, isFree);
}

export async function addCreditInTransaction(
  client: CreditWriteClient,
  userId: string,
  amount: Decimal,
  isFree: boolean,
) {
  return addCreditWithClient(client, userId, amount, isFree);
}

export async function batchDeductCredit(
  params: BatchDeductCreditParams,
): Promise<BatchDeductCreditResult> {
  const { userId } = params;
  const records = params.records?.map((record) => ({
    ...record,
    amount: assertPositiveFiniteDecimal(record.amount),
  }));

  if (!records || records.length === 0) {
    return {
      success: false,
      error: 'No records provided',
    };
  }

  try {
    return await multipostDb.$transaction(async (tx) => {
      const credit = await tx.credit.findUnique({
        where: { userId },
      });

      if (!credit) {
        return {
          success: false,
          error: 'Insufficient credits',
        };
      }

      const totalAmount = records.reduce((acc, record) => acc.add(record.amount), new Decimal(0));

      const totalCredits = Decimal.add(credit.credits, credit.freeCredits);
      if (totalCredits < totalAmount) {
        return {
          success: false,
          error: 'Insufficient credits',
        };
      }

      const remainingAmount = new Decimal(totalAmount);
      const freeCreditsToUse = Decimal.min(credit.freeCredits, remainingAmount);
      const paidCreditsToUse = remainingAmount.sub(freeCreditsToUse);

      const updatedCredit = await tx.credit.update({
        where: { userId },
        data: {
          freeCredits: credit.freeCredits.sub(freeCreditsToUse),
          credits: credit.credits.sub(paidCreditsToUse),
        },
      });

      const failedRecords: Array<{
        type: (typeof records)[number]['type'];
        amount: Decimal;
        error: string;
      }> = [];

      let allocatedFreeCredits = new Decimal(0);
      let remainingFreeCredits = freeCreditsToUse;

      for (const record of records) {
        try {
          const recordFreeCredits = Decimal.min(remainingFreeCredits, record.amount);
          const recordPaidCredits = record.amount.sub(recordFreeCredits);

          remainingFreeCredits = remainingFreeCredits.sub(recordFreeCredits);
          allocatedFreeCredits = allocatedFreeCredits.add(recordFreeCredits);

          if (recordFreeCredits.greaterThan(0)) {
            await tx.creditUsage.create({
              data: {
                userId,
                type: record.type,
                amount: recordFreeCredits,
                isFree: true,
              },
            });
          }

          if (recordPaidCredits.greaterThan(0)) {
            await tx.creditUsage.create({
              data: {
                userId,
                type: record.type,
                amount: recordPaidCredits,
                isFree: false,
              },
            });
          }
        } catch (error) {
          failedRecords.push({
            type: record.type,
            amount: record.amount,
            error: (error as Error).message,
          });
        }
      }

      return {
        success: true,
        remainingCredits: {
          credits: Number(updatedCredit.credits),
          freeCredits: Number(updatedCredit.freeCredits),
          totalCredits: Number(updatedCredit.credits.add(updatedCredit.freeCredits)),
        },
        failedRecords: failedRecords.length > 0 ? failedRecords : undefined,
        usage: {
          credits: Number(totalAmount),
        },
      };
    });
  } catch (error) {
    return {
      success: false,
      error: `${(error as Error).message}`,
    };
  }
}
