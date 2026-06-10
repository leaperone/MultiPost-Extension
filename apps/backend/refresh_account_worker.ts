import { eq, lt, lte } from "drizzle-orm";
import { SocialMediaAccount as SocialMediaAccountTable } from "@db/schema/index.ts";
import { SocialMediaClientFactory } from "./client/factory.ts";
import type { MultipostDb } from "./db.ts";

// Worker class to handle account refresh
export class RefreshAccountWorker {
  private db: MultipostDb;
  private clientFactory: SocialMediaClientFactory;

  constructor(database: MultipostDb) {
    this.db = database;
    this.clientFactory = SocialMediaClientFactory.getInstance(database);
  }

  /**
   * Refresh a single social media account using the appropriate platform client
   * @param accountId - Account ID to refresh
   */
  async refreshAccount(accountId: string): Promise<void> {
    try {
      console.log(`🔄 Refreshing account: ${accountId}`);

      // Get account from database
      const [account] = await this.db
        .select()
        .from(SocialMediaAccountTable)
        .where(eq(SocialMediaAccountTable.id, accountId))
        .limit(1);

      if (!account) {
        throw new Error(`Account not found: ${accountId}`);
      }

      console.log(
        `📋 Found account: ${account.platform} - ${
          account.username || account.displayName
        } (isActive=${account.isActive})`,
      );

      // Check if platform is supported
      if (!this.clientFactory.isPlatformSupported(account.platform)) {
        console.log(`⚠️  Unsupported platform: ${account.platform}`);
        return;
      }

      // Use the platform client to refresh the account
      const result = await this.clientFactory.processRefreshAccount(
        accountId,
        account.platform,
      );

      if (result.success) {
        console.log(
          `✅ Successfully refreshed ${account.platform} account ${accountId}: ${result.message}`,
        );
      } else {
        console.error(
          `❌ Failed to refresh ${account.platform} account ${accountId}: ${result.message}`,
        );
        throw new Error(result.message);
      }
    } catch (error) {
      console.error(`❌ Error refreshing account ${accountId}:`, error);
      throw error;
    }
  }

  /**
   * Process all accounts that need refresh (expiring within 1 hour)
   */
  async processAllAccountsNeedingRefresh(): Promise<void> {
    try {
      // Find accounts expiring within 1 hour (regardless of isActive)
      const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);

      const accountsNeedingRefresh = await this.db
        .select()
        .from(SocialMediaAccountTable)
        .where(lte(SocialMediaAccountTable.expiresAt, oneHourFromNow));

      console.log(
        `📋 Found ${accountsNeedingRefresh.length} accounts expiring within 1 hour (all statuses)`,
      );

      for (const account of accountsNeedingRefresh) {
        try {
          await this.refreshAccount(account.id);
        } catch (error) {
          console.error(`❌ Failed to refresh account ${account.id}:`, error);
        }
      }
    } catch (error) {
      console.error(`❌ Error processing accounts needing refresh:`, error);
    }
  }

  /**
   * Process expired accounts
   */
  async processExpiredAccounts(): Promise<void> {
    try {
      const expiredAccounts = await this.db
        .select()
        .from(SocialMediaAccountTable)
        .where(lt(SocialMediaAccountTable.expiresAt, new Date()));

      const activeExpiredAccounts = expiredAccounts.filter((account) =>
        account.isActive
      );

      console.log(`📋 Found ${activeExpiredAccounts.length} expired accounts`);

      for (const account of activeExpiredAccounts) {
        try {
          await this.refreshAccount(account.id);
        } catch (error) {
          console.error(
            `❌ Failed to refresh expired account ${account.id}:`,
            error,
          );
        }
      }
    } catch (error) {
      console.error(`❌ Error processing expired accounts:`, error);
    }
  }

  /**
   * Validate all active accounts
   */
  async validateAllActiveAccounts(): Promise<void> {
    try {
      const activeAccounts = await this.db
        .select()
        .from(SocialMediaAccountTable)
        .where(eq(SocialMediaAccountTable.isActive, true));

      console.log(`📋 Validating ${activeAccounts.length} active accounts`);

      for (const account of activeAccounts) {
        try {
          await this.refreshAccount(account.id);
        } catch (error) {
          console.error(`❌ Failed to validate account ${account.id}:`, error);
        }
      }
    } catch (error) {
      console.error(`❌ Error validating active accounts:`, error);
    }
  }

  /**
   * Process all accounts that need refresh for a specific platform
   */
  async processAllAccountsNeedingRefreshForPlatform(
    platform: string,
  ): Promise<void> {
    try {
      console.log(`🔄 Processing all ${platform} accounts needing refresh...`);
      const results = await this.clientFactory.processAllAccountsNeedingRefresh(
        platform,
      );

      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      console.log(
        `📊 ${platform} accounts processed: ${successCount} success, ${failureCount} failed`,
      );
    } catch (error) {
      console.error(
        `❌ Error processing ${platform} accounts needing refresh:`,
        error,
      );
    }
  }
}
