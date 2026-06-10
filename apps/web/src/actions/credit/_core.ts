// SERVER-INTERNAL ONLY. Never expose as a client-callable server function. Callers must authorize the userId themselves.

import type {
  BatchDeductCreditParams,
  BatchDeductCreditResult,
  CreditInfo,
  DeductCreditParams,
  DeductCreditResult,
} from '@/actions/credit/types';
import { isMultipostRootDbClient } from '@db/client';
import { Credit, CreditUsage } from '@db/schema/schema';
import {
  creditIncrement,
  fromDecimal,
  toDecimal,
  type DecimalInput,
} from '@db/helpers';
import Decimal from 'decimal.js';
import { eq } from 'drizzle-orm';

import { db } from '../../lib/db';

type DrizzleDb = typeof db;
type DrizzleTransaction = Parameters<Parameters<DrizzleDb['transaction']>[0]>[0];
export type CreditDbClient = DrizzleDb | DrizzleTransaction;

type CreditRow = typeof Credit.$inferSelect;
type DeductRecord = {
  type: DeductCreditParams['type'];
  amount: Decimal;
};

function hasCallableProperty<T extends string>(
  value: unknown,
  property: T,
): value is Record<T, (...args: never[]) => unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<T, unknown>)[property] === 'function'
  );
}

function isTransactionClient(client: CreditDbClient): client is DrizzleTransaction {
  return hasCallableProperty(client, 'rollback');
}

function isRootDbClient(client: CreditDbClient): client is DrizzleDb {
  if (isMultipostRootDbClient(client)) {
    return true;
  }

  return hasCallableProperty(client, 'transaction') && !isTransactionClient(client);
}

function assertPositiveFiniteDecimal(amount: DecimalInput): Decimal {
  const decimal = toDecimal(amount);

  if (!decimal.isFinite() || !decimal.greaterThan(0)) {
    throw new Error('Amount must be finite and greater than 0');
  }

  return decimal;
}

function creditInfoFromRow(credit: Pick<CreditRow, 'credits' | 'freeCredits'>): CreditInfo {
  const credits = toDecimal(credit.credits);
  const freeCredits = toDecimal(credit.freeCredits);

  return {
    credits: credits.toNumber(),
    freeCredits: freeCredits.toNumber(),
    totalCredits: credits.add(freeCredits).toNumber(),
  };
}

async function ensureCreditRow(client: CreditDbClient, userId: string): Promise<CreditRow> {
  const [created] = await client
    .insert(Credit)
    .values({
      userId,
      credits: fromDecimal(0),
      freeCredits: fromDecimal(0),
    })
    .onConflictDoNothing({ target: Credit.userId })
    .returning();

  if (created) {
    return created;
  }

  const [credit] = await client.select().from(Credit).where(eq(Credit.userId, userId)).limit(1);
  if (!credit) {
    throw new Error('Failed to create credit account');
  }

  return credit;
}

async function withCreditTransaction<T>(
  client: CreditDbClient,
  fn: (tx: DrizzleTransaction) => Promise<T>,
): Promise<T> {
  if (isRootDbClient(client)) {
    return client.transaction((tx) => fn(tx));
  }

  return fn(client);
}

async function spendCreditsInTransaction(
  tx: DrizzleTransaction,
  userId: string,
  records: DeductRecord[],
): Promise<{
  updatedCredit: CreditRow;
  totalAmount: Decimal;
}> {
  const [credit] = await tx
    .select()
    .from(Credit)
    .where(eq(Credit.userId, userId))
    .for('update')
    .limit(1);

  if (!credit) {
    throw new Error('Insufficient credits');
  }

  const totalAmount = records.reduce((acc, record) => acc.add(record.amount), new Decimal(0));
  const currentCredits = toDecimal(credit.credits);
  const currentFreeCredits = toDecimal(credit.freeCredits);
  const totalCredits = currentCredits.add(currentFreeCredits);

  if (totalCredits.lessThan(totalAmount)) {
    throw new Error('Insufficient credits');
  }

  const freeCreditsToUse = Decimal.min(currentFreeCredits, totalAmount);
  const paidCreditsToUse = totalAmount.sub(freeCreditsToUse);

  const [updatedCredit] = await tx
    .update(Credit)
    .set({
      freeCredits: fromDecimal(currentFreeCredits.sub(freeCreditsToUse)),
      credits: fromDecimal(currentCredits.sub(paidCreditsToUse)),
    })
    .where(eq(Credit.userId, userId))
    .returning();

  if (!updatedCredit) {
    throw new Error('Insufficient credits');
  }

  const usageRows: (typeof CreditUsage.$inferInsert)[] = [];
  let remainingFreeCredits = freeCreditsToUse;

  for (const record of records) {
    const recordFreeCredits = Decimal.min(remainingFreeCredits, record.amount);
    const recordPaidCredits = record.amount.sub(recordFreeCredits);

    remainingFreeCredits = remainingFreeCredits.sub(recordFreeCredits);

    if (recordFreeCredits.greaterThan(0)) {
      usageRows.push({
        userId,
        type: record.type,
        amount: fromDecimal(recordFreeCredits),
        isFree: true,
      });
    }

    if (recordPaidCredits.greaterThan(0)) {
      usageRows.push({
        userId,
        type: record.type,
        amount: fromDecimal(recordPaidCredits),
        isFree: false,
      });
    }
  }

  if (usageRows.length > 0) {
    await tx.insert(CreditUsage).values(usageRows);
  }

  return { updatedCredit, totalAmount };
}

export async function getCreditInfo(
  userId: string,
  client: CreditDbClient = db,
): Promise<CreditInfo> {
  const credit = await ensureCreditRow(client, userId);
  return creditInfoFromRow(credit);
}

export async function getCredit(userId: string, client: CreditDbClient = db): Promise<CreditInfo> {
  return getCreditInfo(userId, client);
}

export async function preCheckCredit(
  userId: string,
  amount = 0.1,
  client: CreditDbClient = db,
): Promise<boolean> {
  const credit = await getCreditInfo(userId, client);
  return credit.totalCredits >= amount;
}

export async function deductCredit(
  params: DeductCreditParams,
  client: CreditDbClient = db,
): Promise<DeductCreditResult> {
  const { userId, type } = params;
  const amount = assertPositiveFiniteDecimal(params.amount);

  try {
    const { updatedCredit } = await withCreditTransaction(client, (tx) =>
      spendCreditsInTransaction(tx, userId, [{ type, amount }]),
    );

    return {
      success: true,
      remainingCredits: creditInfoFromRow(updatedCredit),
      usage: {
        credits: amount.toNumber(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `${(error as Error).message}`,
    };
  }
}

export async function addCredit(
  userId: string,
  amount: DecimalInput,
  isFree: boolean,
  client: CreditDbClient = db,
) {
  const amountToAdd = assertPositiveFiniteDecimal(amount);
  const creditToAdd = isFree ? new Decimal(0) : amountToAdd;
  const freeCreditToAdd = isFree ? amountToAdd : new Decimal(0);

  try {
    const [updatedCredit] = await client
      .insert(Credit)
      .values({
        userId,
        credits: fromDecimal(creditToAdd),
        freeCredits: fromDecimal(freeCreditToAdd),
      })
      .onConflictDoUpdate({
        target: Credit.userId,
        set: {
          credits: creditIncrement(Credit.credits, creditToAdd),
          freeCredits: creditIncrement(Credit.freeCredits, freeCreditToAdd),
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!updatedCredit) {
      throw new Error('Failed to add credit');
    }

    return {
      success: true,
      remainingCredits: creditInfoFromRow(updatedCredit),
    };
  } catch (error) {
    return { success: false, error: `${(error as Error).message}` };
  }
}

export async function addCreditInTransaction(
  client: CreditDbClient,
  userId: string,
  amount: DecimalInput,
  isFree: boolean,
) {
  return addCredit(userId, amount, isFree, client);
}

export async function batchDeductCredit(
  params: BatchDeductCreditParams,
  client: CreditDbClient = db,
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
    const { updatedCredit, totalAmount } = await withCreditTransaction(client, (tx) =>
      spendCreditsInTransaction(tx, userId, records),
    );

    return {
      success: true,
      remainingCredits: creditInfoFromRow(updatedCredit),
      failedRecords: undefined,
      usage: {
        credits: totalAmount.toNumber(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `${(error as Error).message}`,
    };
  }
}
