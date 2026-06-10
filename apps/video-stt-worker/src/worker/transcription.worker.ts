import { asc, eq } from 'drizzle-orm';
import { VideoTranscription as VideoTranscriptionTable } from '@db/schema/index.ts';
import { STTService } from '../services/stt.service.ts';
import { getConfig } from '../config.ts';
import { logger } from '../utils/logger.ts';
import type { MultipostDb } from '../db.ts';

/**
 * Processing state manager (singleton) to prevent duplicate processing
 */
export class ProcessingManager {
  private static instance: ProcessingManager;
  private processingTasks: Set<string> = new Set();

  private constructor() {}

  static getInstance(): ProcessingManager {
    if (!ProcessingManager.instance) {
      ProcessingManager.instance = new ProcessingManager();
    }
    return ProcessingManager.instance;
  }

  isProcessing(taskId: string): boolean {
    return this.processingTasks.has(taskId);
  }

  startProcessing(taskId: string): boolean {
    if (this.processingTasks.has(taskId)) {
      return false;
    }
    this.processingTasks.add(taskId);
    logger.info(`📝 Task ${taskId} marked as processing. Active: ${this.processingTasks.size}`);
    return true;
  }

  finishProcessing(taskId: string): void {
    this.processingTasks.delete(taskId);
    logger.info(`✅ Task ${taskId} finished. Active: ${this.processingTasks.size}`);
  }

  getProcessingCount(): number {
    return this.processingTasks.size;
  }

  clearAll(): void {
    logger.warn(`🧹 Clearing all processing tasks. Previously had: ${this.processingTasks.size}`);
    this.processingTasks.clear();
  }
}

/**
 * Video Transcription Worker
 * Polls database for pending transcription tasks and processes them
 * Note: Video info extraction is now done on the web side before task creation
 */
export class TranscriptionWorker {
  private db: MultipostDb;
  private sttService: STTService;
  private processingManager: ProcessingManager;
  private maxConcurrent: number = 3;

  constructor(database: MultipostDb, maxConcurrent: number = 3) {
    this.db = database;
    this.processingManager = ProcessingManager.getInstance();
    this.maxConcurrent = maxConcurrent;

    const config = getConfig();
    this.sttService = new STTService(config);

    logger.info(`🎬 TranscriptionWorker initialized (max concurrent: ${maxConcurrent})`);
  }

  /**
   * Recover tasks stuck in 'processing' state (e.g., after restart)
   */
  async recoverProcessingTasks(): Promise<void> {
    try {
      logger.info('🔄 Recovering tasks stuck in processing state...');

      const stuckTasks = await this.db
        .select({ id: VideoTranscriptionTable.id })
        .from(VideoTranscriptionTable)
        .where(eq(VideoTranscriptionTable.status, 'processing'));

      if (stuckTasks.length === 0) {
        logger.info('✅ No stuck tasks to recover');
        return;
      }

      logger.warn(`⚠️ Found ${stuckTasks.length} stuck task(s), resetting to pending`);

      for (const { id } of stuckTasks) {
        try {
          await this.db
            .update(VideoTranscriptionTable)
            .set({ status: 'pending', error: null, updatedAt: new Date() })
            .where(eq(VideoTranscriptionTable.id, id));
          logger.info(`♻️ Task ${id} reset to pending`);
        } catch (err) {
          logger.error(`❌ Failed to reset task ${id}:`, err);
        }
      }
    } catch (err) {
      logger.error('❌ Failed to recover processing tasks:', err);
    }
  }

  /**
   * Process all pending transcription tasks
   */
  async processAllPendingTasks(): Promise<void> {
    try {
      const currentProcessing = this.processingManager.getProcessingCount();
      const availableSlots = this.maxConcurrent - currentProcessing;

      if (availableSlots <= 0) {
        logger.debug(
          `⏳ Max concurrent tasks reached (${currentProcessing}/${this.maxConcurrent})`,
        );
        return;
      }

      const pendingTasks = await this.db
        .select()
        .from(VideoTranscriptionTable)
        .where(eq(VideoTranscriptionTable.status, 'pending'))
        .orderBy(asc(VideoTranscriptionTable.createdAt))
        .limit(availableSlots);

      if (pendingTasks.length === 0) {
        logger.debug('📭 No pending transcription tasks');
        return;
      }

      logger.info(`📋 Found ${pendingTasks.length} pending task(s), processing...`);

      // Process tasks concurrently
      const promises = pendingTasks.map((task) =>
        this.processTranscription(task.id).catch((err) => {
          logger.error(`❌ Task ${task.id} failed:`, err);
        })
      );

      await Promise.all(promises);
    } catch (err) {
      logger.error('❌ Failed to process pending tasks:', err);
    }
  }

  /**
   * Process a single transcription task
   */
  async processTranscription(taskId: string): Promise<void> {
    // Check if already processing
    if (this.processingManager.isProcessing(taskId)) {
      logger.warn(`⚠️ Task ${taskId} is already being processed, skipping`);
      return;
    }

    // Mark as processing
    if (!this.processingManager.startProcessing(taskId)) {
      logger.warn(`⚠️ Failed to mark task ${taskId} as processing`);
      return;
    }

    try {
      // Get task from database
      const [task] = await this.db
        .select()
        .from(VideoTranscriptionTable)
        .where(eq(VideoTranscriptionTable.id, taskId))
        .limit(1);

      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      if (task.status !== 'pending') {
        logger.warn(`⚠️ Task ${taskId} is not pending (status: ${task.status}), skipping`);
        return;
      }

      logger.emoji('🎬', `Processing transcription: ${taskId}`);
      logger.info(`📎 Video URL: ${task.videoUrl}`);

      // Check if audioUrl is available (extracted on web side)
      if (!task.audioUrl) {
        throw new Error(
          'Audio URL not available. Video info should be extracted on web side before creating task.',
        );
      }

      // Update status to processing
      await this.db
        .update(VideoTranscriptionTable)
        .set({ status: 'processing', updatedAt: new Date() })
        .where(eq(VideoTranscriptionTable.id, taskId));

      logger.info(`🎵 Audio URL: ${task.audioUrl.substring(0, 80)}...`);
      if (task.duration) {
        logger.info(
          `⏱️ Duration: ${task.duration}s (${Math.floor(task.duration / 60)}m ${
            task.duration % 60
          }s)`,
        );
      }

      // Transcribe audio (video info already extracted on web side)
      logger.startTimer(`transcribe-${taskId}`);
      const sttResult = await this.sttService.transcribe(task.audioUrl);
      const transcript = sttResult.text;
      const transcribeTime = logger.endTimer(`transcribe-${taskId}`);
      logger.info(`⏱️ Transcription took ${(transcribeTime / 1000).toFixed(2)}s`);

      // Update with transcript and mark as completed
      await this.db
        .update(VideoTranscriptionTable)
        .set({
          transcript,
          status: 'completed',
          updatedAt: new Date(),
        })
        .where(eq(VideoTranscriptionTable.id, taskId));

      logger.success(`🎉 Task ${taskId} completed successfully!`);
      logger.info(`📝 Transcript length: ${transcript.length} characters`);
    } catch (error) {
      logger.error(`❌ Error processing task ${taskId}:`, error);

      // Update status to failed
      try {
        await this.db
          .update(VideoTranscriptionTable)
          .set({
            status: 'failed',
            error: error instanceof Error ? error.message : String(error),
            updatedAt: new Date(),
          })
          .where(eq(VideoTranscriptionTable.id, taskId));
      } catch (updateErr) {
        logger.error(`❌ Failed to update task status:`, updateErr);
      }

      throw error;
    } finally {
      this.processingManager.finishProcessing(taskId);
    }
  }
}
