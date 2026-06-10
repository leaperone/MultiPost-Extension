import { and, count, eq, lte } from "drizzle-orm";
import {
  Draft as DraftTable,
  PublishTask as PublishTaskTable,
  PublishTaskLog as PublishTaskLogTable,
} from "@db/schema/index.ts";
import { SocialMediaClientFactory } from "./client/factory.ts";
import { getErrorMessage, PublishTask, PublishTaskLog } from "./client/base.ts";
import type { MultipostDb } from "./db.ts";

// Publish task processing state management
export class ProcessingPublishTaskManager {
  private static instance: ProcessingPublishTaskManager;
  private processingTasks: Set<string> = new Set();

  private constructor() {}

  static getInstance(): ProcessingPublishTaskManager {
    if (!ProcessingPublishTaskManager.instance) {
      ProcessingPublishTaskManager.instance =
        new ProcessingPublishTaskManager();
    }
    return ProcessingPublishTaskManager.instance;
  }

  // Check if a task is currently being processed
  isProcessing(taskId: string): boolean {
    return this.processingTasks.has(taskId);
  }

  // Mark task as processing
  startProcessing(taskId: string): boolean {
    if (this.processingTasks.has(taskId)) {
      return false; // Already processing
    }
    this.processingTasks.add(taskId);
    console.log(
      `📝 Publish task ${taskId} marked as processing. Active tasks: ${this.processingTasks.size}`,
    );
    return true;
  }

  // Mark task as completed/failed (remove from processing list)
  finishProcessing(taskId: string): void {
    this.processingTasks.delete(taskId);
    console.log(
      `✅ Publish task ${taskId} removed from processing. Active tasks: ${this.processingTasks.size}`,
    );
  }

  // Get list of currently processing tasks
  getProcessingTasks(): string[] {
    return Array.from(this.processingTasks);
  }

  // Get count of processing tasks
  getProcessingCount(): number {
    return this.processingTasks.size;
  }

  // Clear all processing tasks (useful for restart scenarios)
  clearAll(): void {
    console.log(
      `🧹 Clearing all processing publish tasks. Previously had: ${this.processingTasks.size}`,
    );
    this.processingTasks.clear();
  }
}

// Worker class to handle publish task processing
export class PublishTaskWorker {
  private db: MultipostDb;
  private processingManager: ProcessingPublishTaskManager;
  private clientFactory: SocialMediaClientFactory;

  constructor(database: MultipostDb) {
    this.db = database;
    this.processingManager = ProcessingPublishTaskManager.getInstance();
    this.clientFactory = SocialMediaClientFactory.getInstance(database);
  }

  private async getPublishTaskWithPendingLogs(
    taskId: string,
  ): Promise<PublishTask | null> {
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
          eq(PublishTaskLogTable.publishTaskId, taskId),
          eq(PublishTaskLogTable.status, "pending"),
        ),
      );

    return {
      ...task,
      draft,
      PublishTaskLog: logs,
    };
  }

  private async countLogs(taskId: string, status: string): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(PublishTaskLogTable)
      .where(
        and(
          eq(PublishTaskLogTable.publishTaskId, taskId),
          eq(PublishTaskLogTable.status, status),
        ),
      );

    return result?.count ?? 0;
  }

  async processPublishTask(taskId: string): Promise<void> {
    try {
      console.log(`🔄 Processing publish task: ${taskId}`);

      // Check if task is already being processed
      if (this.processingManager.isProcessing(taskId)) {
        console.log(
          `⚠️  Publish task ${taskId} is already being processed, skipping`,
        );
        return;
      }

      // Mark task as processing
      if (!this.processingManager.startProcessing(taskId)) {
        console.log(
          `⚠️  Failed to mark publish task ${taskId} as processing, skipping`,
        );
        return;
      }

      try {
        // Get publish task with all pending logs
        const publishTask = await this.getPublishTaskWithPendingLogs(taskId);

        if (!publishTask) {
          throw new Error(`Publish task not found: ${taskId}`);
        }

        if (publishTask.status !== "pending") {
          console.log(
            `⚠️  Publish task ${taskId} is not pending (status: ${publishTask.status}), skipping`,
          );
          return;
        }

        // Check if it's time to publish
        const now = new Date();
        if (publishTask.publishedAt > now) {
          console.log(
            `⏰ Publish task ${taskId} is scheduled for ${publishTask.publishedAt}, skipping`,
          );
          return;
        }

        console.log(
          `📋 Found pending publish task for draft: ${publishTask.draft.title}`,
        );
        console.log(
          `📝 Found ${publishTask.PublishTaskLog.length} pending publish logs`,
        );

        // Update task status to processing
        await this.db
          .update(PublishTaskTable)
          .set({ status: "processing", updatedAt: new Date() })
          .where(eq(PublishTaskTable.id, taskId));

        // Process each pending log using the appropriate platform client
        for (const log of publishTask.PublishTaskLog) {
          await this.processPublishTaskLog(log, publishTask);
        }

        // Check if all logs are completed
        const remainingPendingLogs = await this.countLogs(taskId, "pending");

        if (remainingPendingLogs === 0) {
          // All logs completed, check if any failed
          const failedLogs = await this.countLogs(taskId, "failed");

          if (failedLogs > 0) {
            // Some logs failed, mark task as failed
            await this.db
              .update(PublishTaskTable)
              .set({ status: "failed", updatedAt: new Date() })
              .where(eq(PublishTaskTable.id, taskId));
            console.log(
              `❌ Publish task ${taskId} failed due to ${failedLogs} failed logs`,
            );
          } else {
            // All logs succeeded, mark task as completed
            await this.db
              .update(PublishTaskTable)
              .set({ status: "completed", updatedAt: new Date() })
              .where(eq(PublishTaskTable.id, taskId));
            console.log(`🎉 Publish task ${taskId} completed successfully`);
          }
        } else {
          // Still have pending logs, keep task as processing
          console.log(
            `⏳ Publish task ${taskId} still has ${remainingPendingLogs} pending logs`,
          );
        }
      } finally {
        // Always remove from processing list
        this.processingManager.finishProcessing(taskId);
      }
    } catch (error) {
      console.error(`❌ Error processing publish task ${taskId}:`, error);

      // Update task status to failed
      try {
        await this.db
          .update(PublishTaskTable)
          .set({ status: "failed", updatedAt: new Date() })
          .where(eq(PublishTaskTable.id, taskId));
      } catch (updateError) {
        console.error(`Failed to update publish task status:`, updateError);
      }

      // Remove from processing list
      this.processingManager.finishProcessing(taskId);

      throw error;
    }
  }

  /**
   * Process a single publish task log using the appropriate platform client
   * @param log - PublishTaskLog to process
   * @param publishTask - Parent PublishTask
   */
  private async processPublishTaskLog(
    log: PublishTaskLog,
    publishTask: PublishTask,
  ): Promise<void> {
    try {
      console.log(
        `🔄 Processing publish log ${log.id} for platform: ${log.platform}`,
      );

      // Update log status to processing
      await this.db
        .update(PublishTaskLogTable)
        .set({ status: "processing", updatedAt: new Date() })
        .where(eq(PublishTaskLogTable.id, log.id));

      // Check if platform is supported
      if (!this.clientFactory.isPlatformSupported(log.platform)) {
        console.log(`⚠️  Unsupported platform: ${log.platform}`);
        await this.updatePublishTaskLogStatus(
          log.id,
          "failed",
          `Unsupported platform: ${log.platform}`,
        );
        return;
      }

      // Process the log using the platform client
      const result = await this.clientFactory.processPublishTaskLog(
        log.id,
        publishTask,
        log.platform,
      );

      if (result.success) {
        console.log(
          `✅ Successfully processed ${log.platform} log ${log.id}: ${result.message}`,
        );
        // The platform client will handle updating the log status
      } else {
        console.error(
          `❌ Failed to process ${log.platform} log ${log.id}: ${result.message}`,
        );
      }
    } catch (error) {
      console.error(`❌ Error processing publish log ${log.id}:`, error);
      await this.updatePublishTaskLogStatus(
        log.id,
        "failed",
        getErrorMessage(error),
      );
    }
  }

  /**
   * Update publish task log status
   * @param logId - PublishTaskLog ID
   * @param status - New status
   * @param message - Status message
   */
  private async updatePublishTaskLogStatus(
    logId: string,
    status: string,
    message: string,
  ): Promise<void> {
    try {
      await this.db
        .update(PublishTaskLogTable)
        .set({
          status,
          ...(status === "completed" ? { publishedAt: new Date() } : {}),
          ...(status === "failed" ? { error: "PUBLISH_FAILED", message } : {}),
          updatedAt: new Date(),
        })
        .where(eq(PublishTaskLogTable.id, logId));

      console.log(`📝 Updated publish task log status to: ${status}`);
    } catch (error) {
      console.error(`❌ Failed to update publish task log status:`, error);
    }
  }

  /**
   * Process all pending publish tasks
   */
  async processAllPendingTasks(): Promise<void> {
    try {
      const pendingTasks = await this.db
        .select()
        .from(PublishTaskTable)
        .where(
          and(
            eq(PublishTaskTable.status, "pending"),
            lte(PublishTaskTable.publishedAt, new Date()),
          ),
        );

      console.log(`📋 Found ${pendingTasks.length} pending publish tasks`);

      for (const task of pendingTasks) {
        try {
          await this.processPublishTask(task.id);
        } catch (error) {
          console.error(`❌ Failed to process publish task ${task.id}:`, error);
        }
      }
    } catch (error) {
      console.error(`❌ Error processing pending publish tasks:`, error);
    }
  }
}
