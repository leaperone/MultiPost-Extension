import { Decimal } from "decimal.js";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import {
  Credit as CreditTable,
  CreditUsage as CreditUsageTable,
  User as UserTable,
} from "@db/schema/index.ts";
import { fromDecimal } from "@db/helpers.ts";
import type { MultipostDb } from "./db.ts";

/**
 * Worker for processing minimum consumption requirements
 * Runs monthly to ensure users meet minimum consumption targets
 */
export class MinimumConsumptionWorker {
  private multipostDb: MultipostDb;

  constructor(multipostDb: MultipostDb) {
    this.multipostDb = multipostDb;
  }

  /**
   * Get the date range for the previous month
   * @returns Object containing start and end dates for the previous month
   */
  private getPreviousMonthDateRange(): { startDate: Date; endDate: Date } {
    const now = new Date();
    // First day of the current month (e.g., if today is July 15, this is July 1, 00:00:00)
    const firstDayCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // First day of the previous month (e.g., if current month is July, this is June 1, 00:00:00)
    // JavaScript's Date constructor handles month underflow correctly (e.g., month -1 becomes December of previous year)
    const firstDayPreviousMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );

    return {
      startDate: firstDayPreviousMonth, // e.g., June 1, 00:00:00
      endDate: firstDayCurrentMonth, // e.g., July 1, 00:00:00 (exclusive for queries)
    };
  }

  /**
   * Process minimum consumption for all users
   * Checks previous month usage and deducts credits if needed
   */
  async processMinimumConsumption(): Promise<void> {
    console.log("🕐 Starting minimum consumption check cron job...");
    const { startDate, endDate } = this.getPreviousMonthDateRange();
    console.log(
      `📅 Checking consumption for period: ${startDate.toISOString()} (inclusive) to ${endDate.toISOString()} (exclusive)`,
    );

    try {
      const users = await this.multipostDb.select({ id: UserTable.id }).from(
        UserTable,
      );
      console.log(
        `👥 Processing ${users.length} users for minimum consumption check`,
      );

      let processedCount = 0;
      let adjustedCount = 0;
      let errorCount = 0;

      for (const user of users) {
        try {
          const wasAdjusted = await this.processUserMinimumConsumption(
            user.id,
            startDate,
            endDate,
          );
          if (wasAdjusted) {
            adjustedCount++;
          }
          processedCount++;
        } catch (error) {
          console.error(
            `❌ Failed to process minimum consumption for user ${user.id}:`,
            error,
          );
          errorCount++;
        }
      }

      console.log(`✅ Minimum consumption check completed:`);
      console.log(`   - Total users processed: ${processedCount}`);
      console.log(`   - Users with adjustments: ${adjustedCount}`);
      console.log(`   - Errors encountered: ${errorCount}`);
    } catch (error) {
      console.error("❌ Failed to process minimum consumption check:", error);
      throw error;
    }
  }

  /**
   * Process minimum consumption for a specific user
   * @param userId - User ID to process
   * @param startDate - Start date for usage period
   * @param endDate - End date for usage period
   * @returns Promise<boolean> - true if adjustment was made, false otherwise
   */
  private async processUserMinimumConsumption(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<boolean> {
    const [totalUsageResult] = await this.multipostDb
      .select({ amount: sql<string | null>`sum(${CreditUsageTable.amount})` })
      .from(CreditUsageTable)
      .where(
        and(
          eq(CreditUsageTable.userId, userId),
          gte(CreditUsageTable.createdAt, startDate),
          lt(CreditUsageTable.createdAt, endDate),
        ),
      );

    const totalUsagePreviousMonth = new Decimal(totalUsageResult?.amount ?? 0);
    console.log(
      `👤 User ${userId}: Total credit usage last month = ${totalUsagePreviousMonth.toString()}`,
    );

    const minimumConsumptionTarget = new Decimal(5);
    const minimumThreshold = new Decimal(1); // User's consumption must be at least 1

    // Condition: 1 <= totalUsagePreviousMonth < 5
    if (
      totalUsagePreviousMonth.gte(minimumThreshold) &&
      totalUsagePreviousMonth.lessThan(minimumConsumptionTarget)
    ) {
      const amountToDeduct = minimumConsumptionTarget.sub(
        totalUsagePreviousMonth,
      );
      console.log(
        `💰 User ${userId}: Needs to deduct ${amountToDeduct.toString()} to meet minimum consumption target of ${minimumConsumptionTarget.toString()}.`,
      );

      await this.performDeduction(userId, amountToDeduct);
      return true; // Adjustment was made
    } else {
      if (totalUsagePreviousMonth.lt(minimumThreshold)) {
        console.log(
          `ℹ️  User ${userId}: Usage (${totalUsagePreviousMonth.toString()}) is less than the minimum threshold of ${minimumThreshold.toString()}. No adjustment needed.`,
        );
      } else {
        // This means totalUsagePreviousMonth >= minimumConsumptionTarget (i.e., >= 5)
        console.log(
          `✅ User ${userId}: Usage (${totalUsagePreviousMonth.toString()}) meets or exceeds minimum target of ${minimumConsumptionTarget.toString()}. No adjustment needed.`,
        );
      }
      return false; // No adjustment needed
    }
  }

  /**
   * Perform credit deduction for minimum consumption adjustment
   * @param userId - User ID to deduct credits from
   * @param amountToDeduct - Amount to deduct
   */
  private async performDeduction(
    userId: string,
    amountToDeduct: Decimal,
  ): Promise<void> {
    await this.multipostDb.transaction(async (tx) => {
      const [userCredit] = await tx
        .select()
        .from(CreditTable)
        .where(eq(CreditTable.userId, userId))
        .for("update")
        .limit(1);

      if (!userCredit) {
        console.warn(
          `⚠️  User ${userId}: No credit record found. Skipping deduction.`,
        );
        return;
      }

      let remainingDeduction = amountToDeduct;
      let deductedFromFree = new Decimal(0);
      let deductedFromPaid = new Decimal(0);
      const freeCredits = new Decimal(userCredit.freeCredits);
      const credits = new Decimal(userCredit.credits);

      // Attempt to deduct from free credits first
      if (freeCredits.greaterThan(0) && remainingDeduction.greaterThan(0)) {
        const canDeductFromFree = freeCredits.gte(remainingDeduction)
          ? remainingDeduction
          : freeCredits;
        deductedFromFree = canDeductFromFree;
        remainingDeduction = remainingDeduction.sub(canDeductFromFree);
      }

      // Attempt to deduct remaining amount from paid credits
      // Allow paid credits to go negative
      if (remainingDeduction.greaterThan(0)) {
        // Deduct the full remainingDeduction from paid credits, even if it makes the balance negative.
        // The check for userCredit.credits.greaterThan(0) before this block is mostly
        // to conceptually separate the logic, but the actual deduction here doesn't cap at 0.
        deductedFromPaid = remainingDeduction;
        remainingDeduction = remainingDeduction.sub(deductedFromPaid); // This will become 0
      }

      const actualDeductedAmount = deductedFromFree.add(deductedFromPaid);

      if (actualDeductedAmount.equals(0)) {
        if (amountToDeduct.greaterThan(0)) {
          // Log only if a deduction was intended but no credits were available
          console.log(
            `⚠️  User ${userId}: No credits (free or paid) available to perform the deduction of ${amountToDeduct.toString()}. Skipping.`,
          );
        }
        return; // No actual deduction to perform
      }

      // Log if the full intended amount could not be deducted
      if (remainingDeduction.greaterThan(0)) {
        console.warn(
          `⚠️  User ${userId}: Insufficient total credits to deduct the full ${amountToDeduct.toString()}. Successfully deducted ${actualDeductedAmount.toString()}. Amount still needed: ${remainingDeduction.toString()}`,
        );
      }

      // Update user's credit balance
      await tx
        .update(CreditTable)
        .set({
          freeCredits: fromDecimal(freeCredits.sub(deductedFromFree)),
          credits: fromDecimal(credits.sub(deductedFromPaid)),
          updatedAt: new Date(),
        })
        .where(eq(CreditTable.userId, userId));

      // Record usage for the deducted free credits portion
      if (deductedFromFree.greaterThan(0)) {
        await tx.insert(CreditUsageTable).values({
          userId,
          type: "MINIMUM_CONSUMPTION_ADJUSTMENT",
          amount: fromDecimal(deductedFromFree),
          isFree: true, // This portion was from free credits
        });
      }
      // Record usage for the deducted paid credits portion
      if (deductedFromPaid.greaterThan(0)) {
        await tx.insert(CreditUsageTable).values({
          userId,
          type: "MINIMUM_CONSUMPTION_ADJUSTMENT",
          amount: fromDecimal(deductedFromPaid),
          isFree: false, // This portion was from paid credits
        });
      }

      console.log(
        `✅ User ${userId}: Successfully deducted ${actualDeductedAmount.toString()} (Free: ${deductedFromFree.toString()}, Paid: ${deductedFromPaid.toString()}) for minimum consumption adjustment.`,
      );
    });
  }
}
