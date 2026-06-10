/**
 * @file Base Social Media Client
 * @description Base class for all social media platform clients
 * @author AI Assistant
 * @date 2024-12-19
 */

import { and, eq } from "drizzle-orm";
import type { JsonValue } from "@db/helpers.ts";
import {
  Draft as DraftTable,
  PublishTask as PublishTaskTable,
  PublishTaskLog as PublishTaskLogTable,
  SocialMediaAccount as SocialMediaAccountTable,
} from "@db/schema/index.ts";
import type { MultipostDb } from "../db.ts";

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
  metadata: JsonValue | null;
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
  files: JsonValue | null;
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
  publishData: JsonValue | null;
  result: JsonValue | null;
  publishTaskId: string;
}

export interface TaskProcessingResult {
  success: boolean;
  message: string;
  data?: unknown;
  error?: string;
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Base class for all social media platform clients
 */
export abstract class BaseSocialMediaClient {
  protected db: MultipostDb;
  protected platform: string;

  constructor(database: MultipostDb, platform: string) {
    this.db = database;
    this.platform = platform;
  }

  /**
   * Process a publish task log for this platform
   * @param logId - Publish task log ID
   * @returns Promise with processing result
   */
  abstract processPublishTaskLog(
    logId: string,
    publishTask: PublishTask,
  ): Promise<TaskProcessingResult>;

  /**
   * Process account refresh for this platform
   * @param accountId - Account ID to refresh
   * @returns Promise with processing result
   */
  abstract processRefreshAccount(
    accountId: string,
  ): Promise<TaskProcessingResult>;

  /**
   * Process task status check for this platform
   * @param logId - Publish task log ID
   * @param accessToken - Access token for the account
   * @returns Promise with processing result
   */
  abstract processCheckTask(
    logId: string,
    accessToken: string,
  ): Promise<TaskProcessingResult>;

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
    data?: JsonValue,
  ): Promise<void> {
    try {
      await this.db
        .update(PublishTaskLogTable)
        .set({
          status,
          ...(status === "completed" ? { publishedAt: new Date() } : {}),
          ...(status === "failed" ? { error: "TASK_FAILED", message } : {}),
          ...(data !== undefined ? { result: data } : {}),
          updatedAt: new Date(),
        })
        .where(eq(PublishTaskLogTable.id, logId));

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
  protected async updateAccountInfo(
    accountId: string,
    updates: Partial<SocialMediaAccount>,
  ): Promise<void> {
    try {
      // Filter out fields that cannot be updated
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, userId, createdAt, ...updatableFields } = updates;

      await this.db
        .update(SocialMediaAccountTable)
        .set({
          ...updatableFields,
          updatedAt: new Date(),
        } as Partial<typeof SocialMediaAccountTable.$inferInsert>)
        .where(eq(SocialMediaAccountTable.id, accountId));

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
  protected async markAccountInactive(
    accountId: string,
    reason: string,
  ): Promise<void> {
    try {
      await this.db
        .update(SocialMediaAccountTable)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(SocialMediaAccountTable.id, accountId));

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
  protected async getAccount(
    accountId: string,
  ): Promise<SocialMediaAccount | null> {
    try {
      const [account] = await this.db
        .select()
        .from(SocialMediaAccountTable)
        .where(eq(SocialMediaAccountTable.id, accountId))
        .limit(1);

      return account ?? null;
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
      const [task] = await this.db
        .select()
        .from(PublishTaskTable)
        .where(eq(PublishTaskTable.id, taskId))
        .limit(1);

      if (!task) {
        return null;
      }

      const [draft] = await this.db.select().from(DraftTable).where(
        eq(DraftTable.id, task.draftId),
      ).limit(1);

      if (!draft) {
        return null;
      }

      const logs = await this.db
        .select()
        .from(PublishTaskLogTable)
        .where(
          and(
            eq(PublishTaskLogTable.publishTaskId, task.id),
            eq(PublishTaskLogTable.status, "pending"),
          ),
        );

      return {
        ...task,
        draft,
        PublishTaskLog: logs,
      };
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
  protected async getPublishTaskLog(
    logId: string,
  ): Promise<PublishTaskLog | null> {
    try {
      const [log] = await this.db
        .select()
        .from(PublishTaskLogTable)
        .where(eq(PublishTaskLogTable.id, logId))
        .limit(1);

      return log ?? null;
    } catch (error) {
      console.error(`❌ Failed to get publish task log:`, error);
      return null;
    }
  }
}
