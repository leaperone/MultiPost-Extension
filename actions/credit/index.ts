'use server';

import { multipostDb } from '@/lib/db';
import { CreditInfo, DeductCreditParams, DeductCreditResult } from './types';
import { Decimal } from '@prisma/client/runtime/library';

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
