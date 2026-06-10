import { createWorkerDb } from './db.ts';
import { TranscriptionWorker } from './worker/transcription.worker.ts';
import { getConfig, validateConfig } from './config.ts';
import { logger } from './utils/logger.ts';
import { cron } from 'https://deno.land/x/deno_cron@v1.0.0/cron.ts';

/**
 * Main entry point for Video STT Worker
 * Uses database polling instead of HTTP server
 */
async function main() {
  try {
    logger.emoji('🚀', '='.repeat(60));
    logger.emoji('🚀', 'Video STT Worker - Starting up...');
    logger.emoji('🚀', '='.repeat(60));

    // Load and validate configuration
    logger.emoji('⚙️', 'Loading configuration...');
    const config = getConfig();
    validateConfig(config);

    logger.debug('Configuration loaded:');
    logger.debug(`  - Temp dir: ${config.tempDir}`);
    logger.debug(`  - Max file size: ${(config.maxFileSize / 1024 / 1024).toFixed(2)} MB`);
    logger.debug(`  - STT API: ${config.sttApiUrl}`);
    logger.success('✓ Configuration validated');

    // Initialize database connection
    logger.emoji('🔌', 'Connecting to database...');
    const { db } = createWorkerDb();
    logger.success('✓ Database connected');

    // Initialize worker
    const maxConcurrent = 3;
    const worker = new TranscriptionWorker(db, maxConcurrent);

    // Recover any stuck tasks from previous run
    await worker.recoverProcessingTasks();

    // Setup cron job for polling (every 10 seconds)
    const pollInterval = '*/10 * * * * *';
    logger.info(`📅 Setting up cron job: ${pollInterval}`);

    cron(pollInterval, async () => {
      try {
        await worker.processAllPendingTasks();
      } catch (error) {
        logger.error('❌ Cron job failed:', error);
      }
    });

    logger.emoji('🚀', '='.repeat(60));
    logger.success('✅ Video STT Worker is running!');
    logger.info('📊 Mode: Database polling (no HTTP server)');
    logger.info(`⏰ Poll interval: ${pollInterval}`);
    logger.info(`🔢 Max concurrent tasks: ${maxConcurrent}`);
    logger.emoji('🚀', '='.repeat(60));
    logger.info('💡 Press Ctrl+C to stop the worker');
    logger.emoji('🚀', '='.repeat(60));

    // Run initial check
    logger.info('🔍 Running initial task check...');
    await worker.processAllPendingTasks();

    // Keep the process alive
    await new Promise(() => {});
  } catch (error) {
    logger.emoji('🚀', '='.repeat(60));
    logger.error('❌ Failed to start worker:', error);
    logger.emoji('🚀', '='.repeat(60));
    Deno.exit(1);
  }
}

// Run the worker
if (import.meta.main) {
  main();
}
