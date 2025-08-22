/**
 * @file Social Media Client Factory
 * @description Factory for creating and managing social media platform clients
 * @author AI Assistant
 * @date 2024-12-19
 */

import { PrismaClient } from '../prisma/client_multipost_deno/client.ts';
import { BaseSocialMediaClient, PublishTask } from './base.ts';
import { TikTokClient } from './tiktok.ts';
import { XClient } from './x.ts';

/**
 * Factory for creating social media platform clients
 */
export class SocialMediaClientFactory {
  private static instance: SocialMediaClientFactory;
  private clients: Map<string, BaseSocialMediaClient> = new Map();
  private db: PrismaClient;

  private constructor(database: PrismaClient) {
    this.db = database;
    this.initializeClients();
  }

  /**
   * Get singleton instance
   */
  static getInstance(database: PrismaClient): SocialMediaClientFactory {
    if (!SocialMediaClientFactory.instance) {
      SocialMediaClientFactory.instance = new SocialMediaClientFactory(database);
    }
    return SocialMediaClientFactory.instance;
  }

  /**
   * Initialize all available platform clients
   */
  private initializeClients(): void {
    // Register TikTok client
    this.registerClient('tiktok', new TikTokClient(this.db));

    // Register X client
    this.registerClient('x', new XClient(this.db));

    // TODO: Register other platform clients here
    // this.registerClient('youtube', new YouTubeClient(this.db));
    // this.registerClient('twitter', new TwitterClient(this.db));
  }

  /**
   * Register a platform client
   * @param platform - Platform name
   * @param client - Client instance
   */
  private registerClient(platform: string, client: BaseSocialMediaClient): void {
    this.clients.set(platform.toLowerCase(), client);
    console.log(`✅ Registered ${platform} client`);
  }

  /**
   * Get client for a specific platform
   * @param platform - Platform name
   * @returns Client instance or null if not found
   */
  getClient(platform: string): BaseSocialMediaClient | null {
    const client = this.clients.get(platform.toLowerCase());
    if (!client) {
      console.warn(`⚠️  No client found for platform: ${platform}`);
      return null;
    }
    return client;
  }

  /**
   * Get all available platforms
   * @returns Array of platform names
   */
  getAvailablePlatforms(): string[] {
    return Array.from(this.clients.keys());
  }

  /**
   * Check if a platform is supported
   * @param platform - Platform name
   * @returns True if platform is supported
   */
  isPlatformSupported(platform: string): boolean {
    return this.clients.has(platform.toLowerCase());
  }

  /**
   * Process a publish task using the appropriate client
   * @param taskId - Publish task ID
   * @param platform - Platform name
   * @returns Promise with processing result
   */
  async processPublishTaskLog(
    logId: string,
    publishTask: PublishTask,
    platform: string,
  ): Promise<import('./base.ts').TaskProcessingResult> {
    const client = this.getClient(platform);
    if (!client) {
      return {
        success: false,
        message: `Unsupported platform: ${platform}`,
        error: 'UNSUPPORTED_PLATFORM',
      };
    }

    return await client.processPublishTaskLog(logId, publishTask);
  }

  /**
   * Process account refresh using the appropriate client
   * @param accountId - Account ID
   * @param platform - Platform name
   * @returns Promise with processing result
   */
  async processRefreshAccount(accountId: string, platform: string): Promise<import('./base.ts').TaskProcessingResult> {
    const client = this.getClient(platform);
    if (!client) {
      return {
        success: false,
        message: `Unsupported platform: ${platform}`,
        error: 'UNSUPPORTED_PLATFORM',
      };
    }

    return await client.processRefreshAccount(accountId);
  }

  /**
   * Process task status check using the appropriate client
   * @param logId - Publish task log ID
   * @param accessToken - Access token
   * @param platform - Platform name
   * @returns Promise with processing result
   */
  async processCheckTask(
    logId: string,
    accessToken: string,
    platform: string,
  ): Promise<import('./base.ts').TaskProcessingResult> {
    const client = this.getClient(platform);
    if (!client) {
      return {
        success: false,
        message: `Unsupported platform: ${platform}`,
        error: 'UNSUPPORTED_PLATFORM',
      };
    }

    return await client.processCheckTask(logId, accessToken);
  }

  /**
   * Process all accounts that need refresh for a specific platform
   * @param platform - Platform name
   * @returns Promise with processing results
   */
  async processAllAccountsNeedingRefresh(platform: string): Promise<import('./base.ts').TaskProcessingResult[]> {
    const client = this.getClient(platform);
    if (!client) {
      return [
        {
          success: false,
          message: `Unsupported platform: ${platform}`,
          error: 'UNSUPPORTED_PLATFORM',
        },
      ];
    }

    try {
      // Find accounts expiring within 1 hour for this platform
      const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);

      const accountsNeedingRefresh = await this.db.socialMediaAccount.findMany({
        where: {
          platform: platform.toLowerCase(),
          expiresAt: {
            lte: oneHourFromNow,
          },
        },
      });

      console.log(`📋 Found ${accountsNeedingRefresh.length} ${platform} accounts expiring within 1 hour`);

      const results: import('./base.ts').TaskProcessingResult[] = [];
      for (const account of accountsNeedingRefresh) {
        try {
          const result = await client.processRefreshAccount(account.id);
          results.push(result);
        } catch (error) {
          console.error(`❌ Failed to refresh ${platform} account ${account.id}:`, error);
          results.push({
            success: false,
            message: `Error refreshing account: ${error.message}`,
            error: error.message,
          });
        }
      }

      return results;
    } catch (error) {
      console.error(`❌ Error processing ${platform} accounts needing refresh:`, error);
      return [
        {
          success: false,
          message: `Error processing accounts needing refresh: ${error.message}`,
          error: error.message,
        },
      ];
    }
  }
}
