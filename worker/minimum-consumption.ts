import { PrismaClient as PrismaMultipostClient, Prisma } from '../prisma/client_multipost';

// Function to get the date range for the previous month
function getPreviousMonthDateRange(): { startDate: Date; endDate: Date } {
  const now = new Date();
  // First day of the current month (e.g., if today is July 15, this is July 1, 00:00:00)
  const firstDayCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // First day of the previous month (e.g., if current month is July, this is June 1, 00:00:00)
  // JavaScript's Date constructor handles month underflow correctly (e.g., month -1 becomes December of previous year)
  const firstDayPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  return {
    startDate: firstDayPreviousMonth, // e.g., June 1, 00:00:00
    endDate: firstDayCurrentMonth, // e.g., July 1, 00:00:00 (exclusive for queries)
  };
}

export async function processMinimumConsumption(multipostDb: PrismaMultipostClient) {
  console.log('Starting minimum consumption check cron job...');
  const { startDate, endDate } = getPreviousMonthDateRange();
  console.log(
    `Checking consumption for period: ${startDate.toISOString()} (inclusive) to ${endDate.toISOString()} (exclusive)`,
  );

  const users = await multipostDb.user.findMany();

  for (const user of users) {
    try {
      const userId = user.id;
      const totalUsageResult = await multipostDb.creditUsage.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          userId: userId,
          createdAt: {
            gte: startDate, // Usage on or after the first day of the previous month
            lt: endDate, // Usage before the first day of the current month
          },
        },
      });

      const totalUsagePreviousMonth = totalUsageResult._sum.amount || new Prisma.Decimal(0);
      console.log(`User ${userId}: Total credit usage last month = ${totalUsagePreviousMonth.toString()}`);

      const minimumConsumptionTarget = new Prisma.Decimal(5);
      const minimumThreshold = new Prisma.Decimal(1); // User's consumption must be at least 1

      // Condition: 1 <= totalUsagePreviousMonth < 5
      if (totalUsagePreviousMonth.gte(minimumThreshold) && totalUsagePreviousMonth.lessThan(minimumConsumptionTarget)) {
        const amountToDeduct = minimumConsumptionTarget.sub(totalUsagePreviousMonth);
        console.log(
          `User ${userId}: Needs to deduct ${amountToDeduct.toString()} to meet minimum consumption target of ${minimumConsumptionTarget.toString()}.`,
        );

        await multipostDb.$transaction(async (tx) => {
          const userCredit = await tx.credit.findUnique({
            where: { userId },
          });

          if (!userCredit) {
            console.warn(`User ${userId}: No credit record found. Skipping deduction.`);
            return;
          }

          let remainingDeduction = amountToDeduct;
          let deductedFromFree = new Prisma.Decimal(0);
          let deductedFromPaid = new Prisma.Decimal(0);

          // Attempt to deduct from free credits first
          if (userCredit.freeCredits.greaterThan(0) && remainingDeduction.greaterThan(0)) {
            const canDeductFromFree = userCredit.freeCredits.gte(remainingDeduction)
              ? remainingDeduction
              : userCredit.freeCredits;
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
                `User ${userId}: No credits (free or paid) available to perform the deduction of ${amountToDeduct.toString()}. Skipping.`,
              );
            }
            return; // No actual deduction to perform
          }

          // Log if the full intended amount could not be deducted
          if (remainingDeduction.greaterThan(0)) {
            console.warn(
              `User ${userId}: Insufficient total credits to deduct the full ${amountToDeduct.toString()}. Successfully deducted ${actualDeductedAmount.toString()}. Amount still needed: ${remainingDeduction.toString()}`,
            );
          }

          // Update user's credit balance
          await tx.credit.update({
            where: { userId },
            data: {
              freeCredits: userCredit.freeCredits.sub(deductedFromFree),
              credits: userCredit.credits.sub(deductedFromPaid),
            },
          });

          // Record usage for the deducted free credits portion
          if (deductedFromFree.greaterThan(0)) {
            await tx.creditUsage.create({
              data: {
                userId,
                type: 'MINIMUM_CONSUMPTION_ADJUSTMENT',
                amount: deductedFromFree,
                isFree: true, // This portion was from free credits
              },
            });
          }
          // Record usage for the deducted paid credits portion
          if (deductedFromPaid.greaterThan(0)) {
            await tx.creditUsage.create({
              data: {
                userId,
                type: 'MINIMUM_CONSUMPTION_ADJUSTMENT',
                amount: deductedFromPaid,
                isFree: false, // This portion was from paid credits
              },
            });
          }

          console.log(
            `User ${userId}: Successfully deducted ${actualDeductedAmount.toString()} (Free: ${deductedFromFree.toString()}, Paid: ${deductedFromPaid.toString()}) for minimum consumption adjustment.`,
          );
        });
      } else {
        if (totalUsagePreviousMonth.lt(minimumThreshold)) {
          console.log(
            `User ${userId}: Usage (${totalUsagePreviousMonth.toString()}) is less than the minimum threshold of ${minimumThreshold.toString()}. No adjustment needed.`,
          );
        } else {
          // This means totalUsagePreviousMonth >= minimumConsumptionTarget (i.e., >= 5)
          console.log(
            `User ${userId}: Usage (${totalUsagePreviousMonth.toString()}) meets or exceeds minimum target of ${minimumConsumptionTarget.toString()}. No adjustment needed.`,
          );
        }
      }
    } catch (error) {
      console.error(`Failed to process minimum consumption for user ${user.id}:`, error);
    }
  }
  console.log('Finished minimum consumption check cron job.');
}
