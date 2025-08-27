import { ImageGeneration, PrismaClient } from './prisma/client_multipost_deno/client.ts';
import { WorkflowClient, WorkflowChannel, type WorkflowRequest, type WorkflowStreamResult } from './workflow_client.ts';

// Image generation processing state management
export class ProcessingImageGenerationManager {
  private static instance: ProcessingImageGenerationManager;
  private processingImageGenerations: Set<string> = new Set();

  private constructor() {}

  static getInstance(): ProcessingImageGenerationManager {
    if (!ProcessingImageGenerationManager.instance) {
      ProcessingImageGenerationManager.instance = new ProcessingImageGenerationManager();
    }
    return ProcessingImageGenerationManager.instance;
  }

  // Check if an image generation is currently being processed
  isProcessing(imageGenerationId: string): boolean {
    return this.processingImageGenerations.has(imageGenerationId);
  }

  // Mark image generation as processing
  startProcessing(imageGenerationId: string): boolean {
    if (this.processingImageGenerations.has(imageGenerationId)) {
      return false; // Already processing
    }
    this.processingImageGenerations.add(imageGenerationId);
    console.log(
      `🎨 ImageGeneration ${imageGenerationId} marked as processing. Active image generations: ${this.processingImageGenerations.size}`,
    );
    return true;
  }

  // Mark image generation as completed/failed (remove from processing list)
  finishProcessing(imageGenerationId: string): void {
    this.processingImageGenerations.delete(imageGenerationId);
    console.log(
      `✅ ImageGeneration ${imageGenerationId} removed from processing. Active image generations: ${this.processingImageGenerations.size}`,
    );
  }

  // Get list of currently processing image generations
  getProcessingImageGenerations(): string[] {
    return Array.from(this.processingImageGenerations);
  }

  // Get count of processing image generations
  getProcessingCount(): number {
    return this.processingImageGenerations.size;
  }

  // Clear all processing image generations (useful for restart scenarios)
  clearAll(): void {
    console.log(
      `🧹 Clearing all processing image generations. Previously had: ${this.processingImageGenerations.size}`,
    );
    this.processingImageGenerations.clear();
  }
}

// Worker class to handle image generation processing
export class ImageGenerationWorker {
  private client: WorkflowClient;
  private db: PrismaClient;
  private processingManager: ProcessingImageGenerationManager;
  private maxRetries: number = 3;
  private retryDelay: number = 1000; // 1 second delay between retries

  constructor(apiUrl: string, apiKey: string, database: PrismaClient, maxRetries: number = 3) {
    this.client = new WorkflowClient(apiUrl, apiKey);
    this.db = database;
    this.processingManager = ProcessingImageGenerationManager.getInstance();
    this.maxRetries = maxRetries;
  }

  /**
   * Recover image generations left in processing state
   * - Reset status to pending
   * - Clear workflowId
   * - Delete related imageGenerationLog records
   * - Re-dispatch processImageGeneration
   */
  async recoverProcessingImageGenerations(): Promise<void> {
    try {
      console.log('🧭 Recovering image generations left in processing state...');
      const stuckItems = await this.db.imageGeneration.findMany({
        where: { status: 'processing' },
        select: { id: true },
      });

      if (stuckItems.length === 0) {
        console.log('✅ No image generations to recover.');
        return;
      }

      console.log(`⚠️  Found ${stuckItems.length} image generation(s) to recover`);

      for (const { id } of stuckItems) {
        try {
          await this.db.$transaction([
            this.db.imageGenerationLog.deleteMany({ where: { imageGenerationId: id } }),
            this.db.imageGeneration.update({
              where: { id },
              data: { status: 'pending', workflowId: null },
            }),
          ]);

          console.log(`♻️  ImageGeneration ${id} reset to pending and logs cleaned. Re-queueing...`);

          this.processImageGeneration(id).catch((err) => {
            console.error(`Failed to reprocess image generation ${id}:`, err);
          });
        } catch (tErr) {
          console.error(`❌ Failed to recover image generation ${id}:`, tErr);
        }
      }
    } catch (err) {
      console.error('❌ Failed to scan for processing image generations:', err);
    }
  }

  async processImageGeneration(imageGenerationId: string): Promise<void> {
    try {
      console.log(`🔄 Processing image generation: ${imageGenerationId}`);

      // Check if image generation is already being processed
      if (this.processingManager.isProcessing(imageGenerationId)) {
        console.log(`⚠️  ImageGeneration ${imageGenerationId} is already being processed, skipping`);
        return;
      }

      // Mark image generation as processing
      if (!this.processingManager.startProcessing(imageGenerationId)) {
        console.log(`⚠️  Failed to mark image generation ${imageGenerationId} as processing, skipping`);
        return;
      }

      try {
        // Get image generation from database
        const imageGeneration = await this.db.imageGeneration.findUnique({
          where: { id: imageGenerationId },
          include: { user: true },
        });

        if (!imageGeneration) {
          throw new Error(`ImageGeneration not found: ${imageGenerationId}`);
        }

        if (imageGeneration.status !== 'pending') {
          console.log(
            `⚠️  ImageGeneration ${imageGenerationId} is not pending (status: ${imageGeneration.status}), skipping`,
          );
          return;
        }

        console.log(`🎨 Found pending image generation: ${imageGeneration.prompt}`);

        // Update image generation status to processing
        await this.db.imageGeneration.update({
          where: { id: imageGenerationId },
          data: { status: 'processing' },
        });

        // Process image generation with retry logic
        console.log(`🔥 Starting image generation processing`);
        const allUrls = await this.processWithRetry(imageGeneration, imageGenerationId);

        // Update image generation status to completed
        await this.db.imageGeneration.update({
          where: { id: imageGenerationId },
          data: {
            status: 'completed',
          },
        });

        console.log(`🎉 ImageGeneration ${imageGenerationId} completed successfully with ${allUrls.length} images`);
      } finally {
        // Always remove from processing list
        this.processingManager.finishProcessing(imageGenerationId);
      }
    } catch (error) {
      console.error(`❌ Error processing image generation ${imageGenerationId}:`, error);

      // Update image generation status to failed
      try {
        await this.db.imageGeneration.update({
          where: { id: imageGenerationId },
          data: { status: 'failed', message: error instanceof Error ? error.message : String(error) },
        });
      } catch (updateError) {
        console.error(`Failed to update image generation status:`, updateError);
      }

      // Remove from processing list
      this.processingManager.finishProcessing(imageGenerationId);

      throw error;
    }
  }

  private async processWithRetry(imageGeneration: ImageGeneration, imageGenerationId: string): Promise<string[]> {
    const allUrls: string[] = [];
    let remainingCount = imageGeneration.number;
    let attempt = 0;
    const prompt = `${imageGeneration.extraPrompt}\n\n${imageGeneration.prompt}`;

    while (remainingCount > 0 && attempt < this.maxRetries) {
      attempt++;
      console.log(`🔄 Attempt ${attempt}/${this.maxRetries} - Requesting ${remainingCount} images`);

      try {
        // Prepare workflow request for remaining images
        const request: WorkflowRequest = {
          inputs: {
            prompt,
            number: remainingCount,
          },
          user: imageGeneration.userId,
        };

        // Create channel for workflow tracking
        let workflowId = '';
        const channel = new WorkflowChannel()
          .onStart((data) => {
            console.log(`🚀 Image generation started (attempt ${attempt}): ${data.workflow_run_id}`);
            workflowId = data.workflow_run_id;

            // Update image generation with workflow ID
            this.db.imageGeneration
              .update({
                where: { id: imageGenerationId },
                data: { workflowId: workflowId },
              })
              .catch((error) => {
                console.error(`Failed to update workflowId for image generation ${imageGenerationId}:`, error);
              });
          })
          .onProgress((data) => {
            console.log(`⏳ Image generation progress (attempt ${attempt}): Step ${data.current_step}`);
          })
          .onFinish((result) => {
            console.log(`✅ Image generation completed (attempt ${attempt})! Status: ${result.status}`);
          })
          .onError((error) => {
            console.error(`💥 Image generation error (attempt ${attempt}):`, error);
          });

        // Process the workflow
        const result = await this.client.runWorkflowWithChannel(request, channel);

        // Extract URLs from the result
        const urls = this.extractUrls(result);

        if (urls.length > 0) {
          console.log(`📸 Got ${urls.length} URLs in attempt ${attempt}`);

          // Save results to image generation logs
          await this.saveToImageGenerationLogs(imageGenerationId, imageGeneration.userId, urls, result);

          // Add URLs to our collection
          allUrls.push(...urls);

          // Update remaining count
          remainingCount -= urls.length;

          if (remainingCount <= 0) {
            console.log(`🎯 Successfully obtained all ${imageGeneration.number} images`);
            break;
          } else {
            console.log(`📊 Still need ${remainingCount} more images, will retry`);
          }
        } else {
          console.log(`⚠️ No URLs returned in attempt ${attempt}`);
        }

        // Add delay before retry if we need more attempts
        if (remainingCount > 0 && attempt < this.maxRetries) {
          console.log(`⏰ Waiting ${this.retryDelay}ms before retry...`);
          await this.delay(this.retryDelay);
        }
      } catch (error) {
        console.error(`❌ Error in attempt ${attempt}:`, error);

        // If this is the last attempt, throw the error
        if (attempt === this.maxRetries) {
          throw error;
        }

        // Add delay before retry
        if (attempt < this.maxRetries) {
          console.log(`⏰ Waiting ${this.retryDelay}ms before retry...`);
          await this.delay(this.retryDelay);
        }
      }
    }

    if (remainingCount > 0) {
      console.warn(
        `⚠️ Could not generate all requested images. Got ${allUrls.length}/${imageGeneration.number} images after ${this.maxRetries} attempts`,
      );
    }

    return allUrls;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private extractUrls(result: WorkflowStreamResult): string[] {
    const urls: string[] = [];

    if (result.outputs) {
      // Check for image_urls array in outputs
      if (result.outputs.image_urls && Array.isArray(result.outputs.image_urls)) {
        urls.push(...result.outputs.image_urls);
      }

      // Check for urls array in outputs
      if (result.outputs.urls && Array.isArray(result.outputs.urls)) {
        urls.push(...result.outputs.urls);
      }

      // Check for single url field
      if (result.outputs.url && typeof result.outputs.url === 'string') {
        urls.push(result.outputs.url);
      }
    }

    return urls;
  }

  private async saveToImageGenerationLogs(
    imageGenerationId: string,
    userId: string,
    urls: string[],
    result: WorkflowStreamResult,
  ): Promise<void> {
    console.log(`💾 Saving ${urls.length} image URLs to image generation logs`);

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];

      try {
        // Try to upload image to file hosting
        let fileHostingId: string | null = null;
        try {
          const uploadResult = await this.uploadImageToFileHosting(url, imageGenerationId, userId);
          fileHostingId = uploadResult.fileId;
        } catch (uploadError) {
          console.error(`❌ Failed to upload image ${i + 1} to file hosting:`, uploadError);
        }

        await this.db.imageGenerationLog.create({
          data: {
            userId,
            imageGenerationId,
            url: url,
            fileHostingId: fileHostingId,
            response: result.outputs || null,
          },
        });

        console.log(`✅ Image generation log ${i + 1} saved successfully`);
      } catch (error) {
        console.error(`❌ Error saving image generation log ${i + 1}:`, error);
      }
    }
  }

  private async uploadImageToFileHosting(
    imageUrl: string,
    imageGenerationId: string,
    userId: string,
  ): Promise<{ url: string; originalUrl: string; fileId: string; size: number }> {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const internalSecret = process.env.INTERNAL_SECRET;

    if (!internalSecret) {
      throw new Error('INTERNAL_SECRET environment variable is required');
    }

    let fileId = '';
    let fileSize = 0;

    try {
      // Download the generated image first to get its size
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image from ${imageUrl}: ${imageResponse.statusText}`);
      }
      const imageBlob = await imageResponse.blob();
      fileSize = imageBlob.size;

      // Extract filename and content type from URL
      const urlParts = imageUrl.split('/');
      const originalFilename = urlParts[urlParts.length - 1] || `generated-${imageGenerationId}.png`;
      const fileExtension = originalFilename.split('.').pop()?.toLowerCase() || 'png';
      const contentType = `image/${fileExtension}`;

      // Create a file record in our system and get a presigned URL for upload
      const fsCreateUrlResp = await fetch(`${appUrl}/api/v1/file/create`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${internalSecret}`,
          'X-User-Id': userId,
          'X-Source': 'IMAGE_GENERATION',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: originalFilename,
        }),
      });

      if (!fsCreateUrlResp.ok) {
        throw new Error(`Failed to create file upload URL: ${fsCreateUrlResp.statusText}`);
      }

      const fsCreateUrlData = await fsCreateUrlResp.json();
      if (fsCreateUrlData.code !== 0) {
        throw new Error(`Failed to create file upload URL: ${fsCreateUrlData.msg}`);
      }

      fileId = fsCreateUrlData.data.fileId;
      const uploadUrl = fsCreateUrlData.data.url;

      // Upload the image to our file hosting via the presigned URL
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: imageBlob,
        headers: {
          'Content-Type': contentType,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload image to file hosting: ${uploadResponse.statusText}`);
      }

      // Get the permanent preview URL for the uploaded file
      const fsPreviewUrlResp = await fetch(`${appUrl}/api/v1/file/${fileId}/preview`);
      const fsPreviewUrlData = await fsPreviewUrlResp.json();

      let finalUrl = imageUrl; // fallback to original
      if (fsPreviewUrlData.code === 0 && fsPreviewUrlData.data) {
        finalUrl = fsPreviewUrlData.data.previewUrl;
        console.log(`✅ Image uploaded successfully: ${finalUrl}`);
      } else {
        console.warn(`Failed to get preview URL for ${fileId}, using original url`);
      }

      return {
        url: finalUrl,
        originalUrl: imageUrl,
        fileId: fileId,
        size: fileSize,
      };
    } catch (uploadError) {
      console.error('Failed to upload image to file hosting, fallback to original url', uploadError);
      throw uploadError;
    }
  }
}
