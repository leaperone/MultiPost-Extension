import { PrismaClient, Prisma } from './prisma/client_multipost_deno/client.ts';
import { SocialMediaClientFactory } from './client/factory.ts';

// Status checking task management
export class CheckingPublishStatusManager {
  private static instance: CheckingPublishStatusManager;
  private checkingTasks: Set<string> = new Set();

  private constructor() {}

  static getInstance(): CheckingPublishStatusManager {
    if (!CheckingPublishStatusManager.instance) {
      CheckingPublishStatusManager.instance = new CheckingPublishStatusManager();
    }
    return CheckingPublishStatusManager.instance;
  }

  // Check if a task is currently being checked
  isChecking(logId: string): boolean {
    return this.checkingTasks.has(logId);
  }

  // Mark task as checking
  startChecking(logId: string): boolean {
    if (this.checkingTasks.has(logId)) {
      return false; // Already checking
    }
    this.checkingTasks.add(logId);
    console.log(`🔍 Publish status check ${logId} marked as checking. Active checks: ${this.checkingTasks.size}`);
    return true;
  }

  // Mark task as completed/failed (remove from checking list)
  finishChecking(logId: string): void {
    this.checkingTasks.delete(logId);
    console.log(`✅ Publish status check ${logId} removed from checking. Active checks: ${this.checkingTasks.size}`);
  }

  // Get list of currently checking tasks
  getCheckingTasks(): string[] {
    return Array.from(this.checkingTasks);
  }

  // Get count of checking tasks
  getCheckingCount(): number {
    return this.checkingTasks.size;
  }

  // Clear all checking tasks (useful for restart scenarios)
  clearAll(): void {
    console.log(`🧹 Clearing all checking publish status tasks. Previously had: ${this.checkingTasks.size}`);
    this.checkingTasks.clear();
  }
}

// Worker class to handle publish status checking
export class CheckPublishStatusWorker {
  private db: PrismaClient;
  private checkingManager: CheckingPublishStatusManager;
  private clientFactory: SocialMediaClientFactory;

  constructor(database: PrismaClient) {
    this.db = database;
    this.checkingManager = CheckingPublishStatusManager.getInstance();
    this.clientFactory = SocialMediaClientFactory.getInstance(database);
  }

  /**
   * Check and update publish status for a specific log using the appropriate platform client
   * @param logId - PublishTaskLog ID
   * @param accessToken - Access token for the account
   * @param platform - Platform name
   */
  async checkAndUpdatePublishStatus(logId: string, accessToken: string, platform: string): Promise<void> {
    try {
      console.log(`🔍 Checking publish status for log: ${logId} on platform: ${platform}`);

      // Check if log is already being checked
      if (this.checkingManager.isChecking(logId)) {
        console.log(`⚠️  Publish status check ${logId} is already being checked, skipping`);
        return;
      }

      // Mark log as checking
      if (!this.checkingManager.startChecking(logId)) {
        console.log(`⚠️  Failed to mark publish status check ${logId} as checking, skipping`);
        return;
      }

      try {
        // Check if platform is supported
        if (!this.clientFactory.isPlatformSupported(platform)) {
          throw new Error(`Unsupported platform: ${platform}`);
        }

        // Use the platform client to check the task status
        const result = await this.clientFactory.processCheckTask(logId, accessToken, platform);

        if (result.success) {
          console.log(`✅ Successfully checked ${platform} publish status for log ${logId}: ${result.message}`);
        } else {
          console.error(`❌ Failed to check ${platform} publish status for log ${logId}: ${result.message}`);
          throw new Error(result.message);
        }
      } finally {
        // Always remove from checking list
        this.checkingManager.finishChecking(logId);
      }
    } catch (error) {
      console.error(`❌ Error checking publish status for log ${logId}:`, error);

      // Update log with error
      await this.updatePublishTaskLogStatus(logId, 'failed', error.message);

      // Remove from checking list
      this.checkingManager.finishChecking(logId);

      throw error;
    }
  }

  /**
   * Update publish task log status
   * @param logId - PublishTaskLog ID
   * @param status - New status
   * @param message - Status message
   */
  private async updatePublishTaskLogStatus(logId: string, status: string, message: string): Promise<void> {
    try {
      const updateData: Prisma.PublishTaskLogUpdateInput = {
        status,
        updatedAt: new Date(),
      };

      if (status === 'completed') {
        updateData.publishedAt = new Date();
      }

      if (status === 'failed') {
        updateData.error = 'PUBLISH_FAILED';
        updateData.message = message;
      }

      await this.db.publishTaskLog.update({
        where: { id: logId },
        data: updateData,
      });

      console.log(`📝 Updated publish task log status to: ${status}`);
    } catch (error) {
      console.error(`❌ Failed to update publish task log status:`, error);
    }
  }

  /**
   * Process all processing publish task logs that need status checking
   */
  async processAllProcessingLogs(): Promise<void> {
    try {
      // Find all processing logs that have publishData (meaning they've been initialized)
      const processingLogs = await this.db.publishTaskLog.findMany({
        where: {
          status: 'processing',
          publishData: {
            not: Prisma.JsonNull,
          },
        },
      });

      console.log(`📋 Found ${processingLogs.length} processing publish logs to check`);

      for (const log of processingLogs) {
        try {
          // Get account to get access token
          const account = await this.db.socialMediaAccount.findUnique({
            where: {
              userId_platform_platformId: {
                userId: log.userId,
                platform: log.platform,
                platformId: log.platformId,
              },
              isActive: true,
            },
          });

          if (!account) {
            console.error(`❌ No active account found for log ${log.id} on platform ${log.platform}`);
            await this.updatePublishTaskLogStatus(log.id, 'failed', `No active ${log.platform} account found`);
            continue;
          }

          await this.checkAndUpdatePublishStatus(log.id, account.accessToken, log.platform);
        } catch (error) {
          console.error(`❌ Failed to check publish status for log ${log.id}:`, error);
        }
      }
    } catch (error) {
      console.error(`❌ Error processing all processing logs:`, error);
    }
  }

  /**
   * Process a specific publish task's logs
   * @param taskId - PublishTask ID
   */
  async processPublishTaskLogs(taskId: string): Promise<void> {
    try {
      const processingLogs = await this.db.publishTaskLog.findMany({
        where: {
          publishTaskId: taskId,
          status: 'processing',
          publishData: {
            not: Prisma.JsonNull,
          },
        },
      });

      console.log(`📋 Found ${processingLogs.length} processing logs for task ${taskId}`);

      for (const log of processingLogs) {
        try {
          // Get account to get access token
          const account = await this.db.socialMediaAccount.findUnique({
            where: {
              userId_platform_platformId: {
                userId: log.userId,
                platform: log.platform,
                platformId: log.platformId,
              },
              isActive: true,
            },
          });

          if (!account) {
            console.error(`❌ No active account found for log ${log.id} on platform ${log.platform}`);
            await this.updatePublishTaskLogStatus(log.id, 'failed', `No active ${log.platform} account found`);
            continue;
          }

          await this.checkAndUpdatePublishStatus(log.id, account.accessToken, log.platform);
        } catch (error) {
          console.error(`❌ Failed to check publish status for log ${log.id}:`, error);
        }
      }
    } catch (error) {
      console.error(`❌ Error processing publish task logs for task ${taskId}:`, error);
    }
  }

  /**
   * Process all processing logs for a specific platform
   */
  async processAllProcessingLogsForPlatform(platform: string): Promise<void> {
    try {
      console.log(`🔍 Processing all processing ${platform} logs...`);

      // Find all processing logs for the specific platform
      const processingLogs = await this.db.publishTaskLog.findMany({
        where: {
          platform: platform.toLowerCase(),
          status: 'processing',
          publishData: {
            not: Prisma.JsonNull,
          },
        },
      });

      console.log(`📋 Found ${processingLogs.length} processing ${platform} logs to check`);

      for (const log of processingLogs) {
        try {
          // Get account to get access token
          const account = await this.db.socialMediaAccount.findUnique({
            where: {
              userId_platform_platformId: {
                userId: log.userId,
                platform: log.platform,
                platformId: log.platformId,
              },
              isActive: true,
            },
          });

          if (!account) {
            console.error(`❌ No active ${platform} account found for log ${log.id}`);
            await this.updatePublishTaskLogStatus(log.id, 'failed', `No active ${platform} account found`);
            continue;
          }

          await this.checkAndUpdatePublishStatus(log.id, account.accessToken, platform);
        } catch (error) {
          console.error(`❌ Failed to check ${platform} publish status for log ${log.id}:`, error);
        }
      }
    } catch (error) {
      console.error(`❌ Error processing all processing ${platform} logs:`, error);
    }
  }
}
