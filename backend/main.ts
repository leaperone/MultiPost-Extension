import { PrismaClient } from './prisma/client_multipost_deno/client.ts';
import { PublishTaskWorker } from './process_publish_task_worker.ts';
import { RefreshAccountWorker } from './refresh_account_worker.ts';
import { Hono } from 'https://deno.land/x/hono@v4.3.7/mod.ts';
import type { Context, Next } from 'https://deno.land/x/hono@v4.3.7/mod.ts';
import { cron } from 'https://deno.land/x/deno_cron@v1.0.0/cron.ts';
import { CheckPublishStatusWorker } from './check_publish_task_worker.ts';
import { ImageGenerationWorker } from './process_image_generation_worker.ts';
import { MinimumConsumptionWorker } from './minimum_consumption_worker.ts';

const multipostDb = new PrismaClient();

/**
 * Main server entry point using Hono
 */
async function startWorkerServer() {
  // Initialize all workers
  const imageGenerationWorker = new ImageGenerationWorker(
    Deno.env.get('DIFY_API_URL') || '',
    Deno.env.get('DIFY_IMAGE_GEN_KEY') || '',
    multipostDb,
  );

  const publishTaskWorker = new PublishTaskWorker(multipostDb);
  const refreshAccountWorker = new RefreshAccountWorker(multipostDb);
  const checkPublishStatusWorker = new CheckPublishStatusWorker(multipostDb);
  const minimumConsumptionWorker = new MinimumConsumptionWorker(multipostDb);
  // Setup cron jobs
  setupCronJobs(publishTaskWorker, refreshAccountWorker, checkPublishStatusWorker, minimumConsumptionWorker);

  const app = new Hono();

  // Enable CORS for all routes
  app.use('*', async (c: Context, next: Next) => {
    c.header('Access-Control-Allow-Origin', '*');
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (c.req.method === 'OPTIONS') {
      return c.text('', 200);
    }
    await next();
  });

  // POST /worker/process_image_generation
  app.post('/worker/process_image_generation', async (c: Context) => {
    try {
      const body = await c.req.json();
      const { taskId } = body;

      if (!taskId) {
        return c.json({ error: 'taskId is required' }, 400);
      }

      // Process the task asynchronously
      imageGenerationWorker.processImageGeneration(taskId).catch((error) => {
        console.error(`Background image generation processing failed:`, error);
      });

      return c.json({ message: 'Image generation processing started', taskId }, 202);
    } catch (error) {
      console.error('Error handling request:', error);
      return c.json({ error: 'Internal Server Error' }, 500);
    }
  });

  // GET /health
  app.get('/health', (c: Context) => {
    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'multipost-worker',
    });
  });

  // 404 handler
  app.notFound((c: Context) => {
    return c.json({ error: 'Not Found', path: c.req.path }, 404);
  });

  const port = parseInt(Deno.env.get('PORT') || '9000');

  console.log(`🚀 multipost Worker starting on http://localhost:${port}`);
  console.log(`🩺 Health check: http://localhost:${port}/health`);
  console.log(`⚙️  Worker API: http://localhost:${port}/worker/process`);

  Deno.serve({ port }, app.fetch);
}

/**
 * Setup cron jobs for background workers
 * @param publishTaskWorker - PublishTaskWorker instance
 * @param refreshAccountWorker - RefreshAccountWorker instance
 * @param checkPublishStatusWorker - CheckPublishStatusWorker instance
 * @param minimumConsumptionWorker - MinimumConsumptionWorker instance
 */
function setupCronJobs(
  publishTaskWorker: PublishTaskWorker,
  refreshAccountWorker: RefreshAccountWorker,
  checkPublishStatusWorker: CheckPublishStatusWorker,
  minimumConsumptionWorker: MinimumConsumptionWorker,
) {
  // PublishTask worker - run every 5 minutes
  const taskCron = process.env.TASK_CRON || '*/5 * * * *';
  const refreshAccountCron = process.env.REFRESH_ACCOUNT_CRON || '*/30 * * * *';
  const checkPublishStatusCron = process.env.CHECK_PUBLISH_STATUS_CRON || '*/5 * * * *';

  cron(taskCron, async () => {
    try {
      console.log('🕐 Running PublishTask worker');
      await publishTaskWorker.processAllPendingTasks();
      console.log('✅ PublishTask worker completed');
    } catch (error) {
      console.error('❌ PublishTask worker failed:', error);
    }
  });

  // RefreshAccount worker
  if (Deno.env.get('MODE') === 'production') {
    cron(refreshAccountCron, async () => {
      try {
        console.log('🕐 Running RefreshAccount worker');
        await refreshAccountWorker.processAllAccountsNeedingRefresh();
        console.log('✅ RefreshAccount worker completed');
      } catch (error) {
        console.error('❌ RefreshAccount worker failed:', error);
      }
    });
  }

  // CheckPublishStatus worker
  cron(checkPublishStatusCron, async () => {
    try {
      console.log('🕐 Running CheckPublishStatus worker');
      await checkPublishStatusWorker.processAllProcessingLogs();
      console.log('✅ CheckPublishStatus worker completed');
    } catch (error) {
      console.error('❌ CheckPublishStatus worker failed:', error);
    }
  });

  // MinimumConsumption worker - run monthly on the 1st at 00:05
  cron('5 0 1 * *', async () => {
    try {
      console.log('🕐 Running MinimumConsumption worker');
      await minimumConsumptionWorker.processMinimumConsumption();
      console.log('✅ MinimumConsumption worker completed');
    } catch (error) {
      console.error('❌ MinimumConsumption worker failed:', error);
    }
  });

  console.log('📅 Cron jobs scheduled:');
  console.log('   - PublishTask worker');
  console.log('   - RefreshAccount worker');
  console.log('   - CheckPublishStatus worker');
  console.log('   - MinimumConsumption worker (monthly)');
}

// Check if this file is being run directly
if (import.meta.main) {
  await startWorkerServer();
}
