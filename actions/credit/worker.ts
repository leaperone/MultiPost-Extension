import { UsageType } from "./types";
import { multipostDb } from "@/lib/db";
import { Decimal } from "decimal.js";

export async function deductCreditWorker(userId: string, type: UsageType, amount: Decimal) {

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
