'use server';

import { multipostDb } from '@/lib/db';
import {
  CreditInfo,
  DeductCreditParams,
  DeductCreditResult,
  BatchDeductCreditParams,
  BatchDeductCreditResult,
} from './types';
import { Decimal } from '@prisma/client/runtime/library';
import { auth } from '@/auth';

/**
 * get userself credit
 */
export async function getUserSelfCredit(): Promise<CreditInfo> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      credits: 0,
      freeCredits: 0,
      totalCredits: 0,
    };
  }
  const credit = await getCredit(session.user.id);
  return credit;
}

/**
 * 获取用户的信用点数信息
 * @param userId 用户ID
 * @returns 信用点数信息，如果用户不存在则创建新记录
 */
export async function getCredit(userId: string): Promise<CreditInfo> {
  let credit = await multipostDb.credit.findUnique({
    where: { userId },
  });

  if (!credit) {
    // 如果用户没有信用记录，创建一个新的记录
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

/**
 * 预检查用户的信用点数
 * @param userId 用户ID
 * @param amount 需要检查的信用点数, 默认 0.1
 * @returns 是否足够
 */
export async function preCheckCredit(userId: string, amount: number = 0.1): Promise<boolean> {
  const credit = await getCredit(userId);
  return credit.totalCredits >= amount;
}

/**
 * 扣减用户的信用点数
 * @param params 扣减参数
 * @returns 扣减结果
 */
export async function deductCredit(params: DeductCreditParams): Promise<DeductCreditResult> {
  const { userId, type, amount } = params;

  try {
    // 开启事务
    return await multipostDb.$transaction(async (tx) => {
      // 获取当前信用点数
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

      // 优先使用免费点数
      const remainingAmount = new Decimal(amount);
      const freeCreditsToUse = Decimal.min(credit.freeCredits, remainingAmount);
      const paidCreditsToUse = remainingAmount.sub(freeCreditsToUse);

      // 更新信用点数
      const updatedCredit = await tx.credit.update({
        where: { userId },
        data: {
          freeCredits: credit.freeCredits.sub(freeCreditsToUse),
          credits: credit.credits.sub(paidCreditsToUse),
        },
      });

      // 记录使用记录
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

/**
 * 增加用户的信用点数
 * @param userId 用户ID
 * @param amount 增加的信用点数
 * @returns 增加结果
 */
export async function addCredit(userId: string, amount: Decimal, isFree: boolean) {
  try {
    const creditToAdd = isFree ? new Decimal(0) : amount;
    const freeCreditToAdd = isFree ? amount : new Decimal(0);

    const existingCredit = await multipostDb.credit.findUnique({
      where: { userId },
    });

    const updatedCredit = await multipostDb.credit.upsert({
      where: { userId },
      update: {
        credits: existingCredit?.credits.add(creditToAdd) ?? creditToAdd,
        freeCredits: existingCredit?.freeCredits.add(freeCreditToAdd) ?? freeCreditToAdd,
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

/**
 * 批量扣减用户的信用点数
 * @param params 批量扣减参数
 * @returns 批量扣减结果
 */
export async function batchDeductCredit(params: BatchDeductCreditParams): Promise<BatchDeductCreditResult> {
  const { userId, records } = params;

  if (!records || records.length === 0) {
    return {
      success: false,
      error: 'No records provided',
    };
  }

  try {
    // 开启事务
    return await multipostDb.$transaction(async (tx) => {
      // 获取当前信用点数
      const credit = await tx.credit.findUnique({
        where: { userId },
      });

      if (!credit) {
        return {
          success: false,
          error: 'Insufficient credits',
        };
      }

      // 计算总扣减金额
      const totalAmount = records.reduce((acc, record) => acc.add(record.amount), new Decimal(0));

      const totalCredits = Decimal.add(credit.credits, credit.freeCredits);
      if (totalCredits < totalAmount) {
        return {
          success: false,
          error: 'Insufficient credits',
        };
      }

      // 优先使用免费点数
      const remainingAmount = new Decimal(totalAmount);
      const freeCreditsToUse = Decimal.min(credit.freeCredits, remainingAmount);
      const paidCreditsToUse = remainingAmount.sub(freeCreditsToUse);

      // 更新信用点数
      const updatedCredit = await tx.credit.update({
        where: { userId },
        data: {
          freeCredits: credit.freeCredits.sub(freeCreditsToUse),
          credits: credit.credits.sub(paidCreditsToUse),
        },
      });

      // 记录所有的使用记录
      const failedRecords: Array<{
        type: (typeof records)[number]['type'];
        amount: Decimal;
        error: string;
      }> = [];

      // 分配免费积分和付费积分到各个记录
      let allocatedFreeCredits = new Decimal(0);
      let remainingFreeCredits = freeCreditsToUse;

      for (const record of records) {
        try {
          // 先尽可能使用免费积分，不考虑操作类型
          const recordFreeCredits = Decimal.min(remainingFreeCredits, record.amount);
          const recordPaidCredits = record.amount.sub(recordFreeCredits);

          remainingFreeCredits = remainingFreeCredits.sub(recordFreeCredits);
          allocatedFreeCredits = allocatedFreeCredits.add(recordFreeCredits);

          // 创建免费积分使用记录
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

          // 创建付费积分使用记录
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
