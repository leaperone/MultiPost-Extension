/**
 * @file Base Social Media Client
 * @description Base class for all social media platform clients
 * @author AI Assistant
 * @date 2024-12-19
 */

import { PrismaClient } from '../prisma/client_multipost_deno/client.ts';

// Common interfaces for all platforms
export interface SocialMediaAccount {
  id: string;
  userId: string;
  platform: string;
  platformId: string;
  avatarUrl: string | null;
  description: string | null;
  username: string | null;
  displayName: string | null;
  accessToken: string;
  refreshToken: string | null;
  tokenType: string;
  scope: string | null;
  expiresAt: Date | null;
  isActive: boolean;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublishTask {
  id: string;
  userId: string;
  draftId: string;
  publishedAt: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  draft: Draft;
  PublishTaskLog: PublishTaskLog[];
}

export interface Draft {
  title: string | null;
  content: string | null;
  files: unknown;
  userId: string;
}

export interface PublishTaskLog {
  id: string;
  userId: string;
  platform: string;
  status: string;
  platformId: string;
  publishedAt: Date | null;
  error: string | null;
  message: string | null;
  publishData: unknown | null;
  result: unknown | null;
  publishTaskId: string;
}

export interface TaskProcessingResult {
  success: boolean;
  message: string;
  data?: unknown;
  error?: string;
}

/**
 * Base class for all social media platform clients
 */
export abstract class BaseSocialMediaClient {
  protected db: PrismaClient;
  protected platform: string;

  constructor(database: PrismaClient, platform: string) {
    this.db = database;
    this.platform = platform;
  }

  /**
   * Process a publish task log for this platform
   * @param logId - Publish task log ID
   * @returns Promise with processing result
   */
  abstract processPublishTaskLog(logId: string, publishTask: PublishTask): Promise<TaskProcessingResult>;

  /**
   * Process account refresh for this platform
   * @param accountId - Account ID to refresh
   * @returns Promise with processing result
   */
  abstract processRefreshAccount(accountId: string): Promise<TaskProcessingResult>;

  /**
   * Process task status check for this platform
   * @param logId - Publish task log ID
   * @param accessToken - Access token for the account
   * @returns Promise with processing result
   */
  abstract processCheckTask(logId: string, accessToken: string): Promise<TaskProcessingResult>;

  /**
   * Validate if the client can handle the given platform
   * @param platform - Platform name
   * @returns True if this client can handle the platform
   */
  canHandlePlatform(platform: string): boolean {
    return this.platform.toLowerCase() === platform.toLowerCase();
  }

  /**
   * Get platform name
   * @returns Platform name
   */
  getPlatform(): string {
    return this.platform;
  }

  /**
   * Common method to update publish task log status
   * @param logId - PublishTaskLog ID
   * @param status - New status
   * @param message - Status message
   * @param data - Additional data to store
   */
  protected async updatePublishTaskLogStatus(
    logId: string,
    status: string,
    message: string,
    data?: unknown,
  ): Promise<void> {
    try {
      await this.db.publishTaskLog.update({
        where: { id: logId },
        data: {
          status,
          publishedAt: status === 'completed' ? new Date() : undefined,
          error: status === 'failed' ? 'TASK_FAILED' : undefined,
          message: status === 'failed' ? message : undefined,
          result: data ? data : undefined,
          updatedAt: new Date(),
        },
      });

      console.log(`📝 Updated publish task log ${logId} status to: ${status}`);
    } catch (error) {
      console.error(`❌ Failed to update publish task log status:`, error);
    }
  }

  /**
   * Common method to update account information
   * @param accountId - Account ID
   * @param updates - Account updates
   */
  protected async updateAccountInfo(accountId: string, updates: Partial<SocialMediaAccount>): Promise<void> {
    try {
      // Filter out fields that cannot be updated
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, userId, createdAt, metadata, ...updatableFields } = updates;

      await this.db.socialMediaAccount.update({
        where: { id: accountId },
        data: {
          ...updatableFields,
          updatedAt: new Date(),
        },
      });

      console.log(`📝 Updated account info for: ${accountId}`);
    } catch (error) {
      console.error(`❌ Failed to update account info:`, error);
    }
  }

  /**
   * Common method to mark account as inactive
   * @param accountId - Account ID
   * @param reason - Reason for deactivation
   */
  protected async markAccountInactive(accountId: string, reason: string): Promise<void> {
    try {
      await this.db.socialMediaAccount.update({
        where: { id: accountId },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      console.log(`⚠️  Marked account ${accountId} as inactive: ${reason}`);
    } catch (error) {
      console.error(`❌ Failed to mark account as inactive:`, error);
    }
  }

  /**
   * Common method to get account by ID
   * @param accountId - Account ID
   * @returns Account or null if not found
   */
  protected async getAccount(accountId: string): Promise<SocialMediaAccount | null> {
    try {
      return await this.db.socialMediaAccount.findUnique({
        where: { id: accountId },
      });
    } catch (error) {
      console.error(`❌ Failed to get account:`, error);
      return null;
    }
  }

  /**
   * Common method to get publish task by ID
   * @param taskId - Task ID
   * @returns Publish task or null if not found
   */
  protected async getPublishTask(taskId: string): Promise<PublishTask | null> {
    try {
      return await this.db.publishTask.findUnique({
        where: { id: taskId },
        include: { PublishTaskLog: { where: { status: 'pending' } }, draft: true },
      });
    } catch (error) {
      console.error(`❌ Failed to get publish task:`, error);
      return null;
    }
  }

  /**
   * Common method to get publish task log by ID
   * @param logId - Log ID
   * @returns Publish task log or null if not found
   */
  protected async getPublishTaskLog(logId: string): Promise<PublishTaskLog | null> {
    try {
      return await this.db.publishTaskLog.findUnique({
        where: { id: logId },
      });
    } catch (error) {
      console.error(`❌ Failed to get publish task log:`, error);
      return null;
    }
  }
}
