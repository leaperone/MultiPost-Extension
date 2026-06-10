/**
 * @file TikTok Client
 * @description TikTok platform client implementation
 * @author AI Assistant
 * @date 2024-12-19
 */

import { and, eq } from "drizzle-orm";
import type { JsonValue } from "@db/helpers.ts";
import {
  PublishTaskLog as PublishTaskLogTable,
  SocialMediaAccount as SocialMediaAccountTable,
} from "@db/schema/index.ts";
import {
  BaseSocialMediaClient,
  getErrorMessage,
  PublishTask,
  TaskProcessingResult,
} from "./base.ts";
import type { MultipostDb } from "../db.ts";

// Type definitions for TikTok API responses
export interface TikTokTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  refresh_expires_in: number;
  open_id: string;
}

export interface TikTokUserInfo {
  open_id: string;
  union_id: string;
  avatar_url: string;
  avatar_url_100?: string;
  avatar_large_url?: string;
  display_name: string;
  bio_description?: string;
  profile_deep_link?: string;
  is_verified?: boolean;
  username?: string;
  follower_count?: number;
  following_count?: number;
  likes_count?: number;
  video_count?: number;
}

export interface TikTokPostInfo {
  title: string;
  description: string;
  disable_comment?: boolean;
  privacy_level?: string;
  auto_add_music?: boolean;
}

export interface TikTokSourceInfo {
  source: string;
  photo_cover_index?: number;
  photo_images: string[];
}

export interface TikTokApiResponse {
  data?: {
    publish_id?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface TikTokStatusResponse {
  data?: {
    status?: string;
    fail_reason?: string;
    publicaly_available_post_id?: string[];
    uploaded_bytes?: number;
    downloaded_bytes?: number;
    [key: string]: unknown;
  };
  error?: {
    code?: string;
    message?: string;
    log_id?: string;
  };
  [key: string]: unknown;
}

/**
 * Base TikTok API client with common functionality
 */
export abstract class BaseTikTokApiClient {
  protected baseUrl = "https://open.tiktokapis.com/v2";
  protected clientKey = process.env.TIKTOK_CLIENT_KEY || "";
  protected clientSecret = process.env.TIKTOK_CLIENT_SECRET || "";

  constructor(protected accessToken: string) {}

  /**
   * Make a rate-limited request to TikTok API
   * @param url - API endpoint URL
   * @param options - Fetch options
   * @returns Promise with the response
   */
  protected async makeRequest(
    url: string,
    options: RequestInit,
  ): Promise<Response> {
    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TikTok API error: ${response.status} - ${errorText}`);
    }

    return response;
  }
}

/**
 * TikTok client for account refresh operations
 */
export class TikTokRefreshClient extends BaseTikTokApiClient {
  /**
   * Check if the access token is still valid and get user info
   * @returns Promise with the user info
   */
  async validateToken(): Promise<TikTokUserInfo> {
    const url =
      `${this.baseUrl}/user/info/?fields=open_id,union_id,avatar_url,avatar_url_100,avatar_large_url,display_name`;

    const response = await this.makeRequest(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    const data = await response.json();
    return data.data.user as TikTokUserInfo;
  }

  /**
   * Refresh the access token using refresh token
   * @param refreshToken - The refresh token
   * @returns Promise with the token refresh response
   */
  async refreshToken(refreshToken: string): Promise<TikTokTokenResponse> {
    const url = `${this.baseUrl}/oauth/token/`;

    const response = await this.makeRequest(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_key: this.clientKey,
        client_secret: this.clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    const data = await response.json();
    return data as TikTokTokenResponse;
  }
}

/**
 * TikTok client for content publishing operations
 */
export class TikTokPublishClient extends BaseTikTokApiClient {
  private requestCount = 0;
  private lastResetTime = Date.now();
  private readonly RATE_LIMIT = 30; // 30 requests per minute
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute in milliseconds

  /**
   * Check and respect rate limits
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();

    // Reset counter if window has passed
    if (now - this.lastResetTime >= this.RATE_LIMIT_WINDOW) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }

    // Check if we're at the limit
    if (this.requestCount >= this.RATE_LIMIT) {
      const waitTime = this.RATE_LIMIT_WINDOW - (now - this.lastResetTime);
      console.log(`⏳ Rate limit reached, waiting ${waitTime}ms`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      this.requestCount = 0;
      this.lastResetTime = Date.now();
    }

    this.requestCount++;
  }

  /**
   * Initialize content publishing on TikTok
   * @param postInfo - Post information including title, description, etc.
   * @param sourceInfo - Source information including image URLs
   * @returns Promise with the initialization response
   */
  async initContentPublish(
    postInfo: TikTokPostInfo,
    sourceInfo: TikTokSourceInfo,
  ): Promise<TikTokApiResponse> {
    await this.checkRateLimit();

    const url = `${this.baseUrl}/post/publish/content/init/`;

    const payload = {
      post_info: postInfo,
      source_info: sourceInfo,
      post_mode: "DIRECT_POST",
      media_type: "PHOTO",
    };

    const response = await this.makeRequest(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    return await response.json();
  }

  /**
   * Check the status of a publishing task
   * @param publishId - The publish ID returned from init
   * @returns Promise with the status response
   */
  async checkPublishStatus(publishId: string): Promise<TikTokStatusResponse> {
    await this.checkRateLimit();

    const url = `${this.baseUrl}/post/publish/status/fetch/`;

    const response = await this.makeRequest(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({
        publish_id: publishId,
      }),
    });

    return await response.json();
  }
}

/**
 * Utility functions for TikTok operations
 */
export class TikTokUtils {
  /**
   * Prepare description for TikTok post
   * @param content - Original content
   * @returns Formatted description
   */
  static prepareDescription(content: string): string {
    // Clean and format the content for TikTok
    let description = content
      .replace(/<[^>]*>/g, "") // Remove HTML tags
      .replace(/\n+/g, " ") // Replace multiple newlines with space
      .trim();

    // Add hashtags if not present
    if (!description.includes("#")) {
      description += " #fyp #viral";
    }

    // Limit length for TikTok
    if (description.length > 2000) {
      description = description.substring(0, 1997) + "...";
    }

    return description;
  }

  /**
   * Extract image URLs from draft files
   * @param files - Draft files JSON
   * @returns Array of image URLs
   */
  static extractImageUrls(files: unknown): string[] {
    if (!files || !Array.isArray(files)) {
      return [];
    }

    return files
      .filter((file: unknown) => {
        const fileObj = file as { type?: string };
        return fileObj.type?.startsWith("image/");
      })
      .map((file: unknown) => {
        const fileObj = file as { url?: string };
        return fileObj.url;
      })
      .filter((url: string | undefined): url is string => !!url);
  }
}

/**
 * TikTok platform client implementation
 */
export class TikTokClient extends BaseSocialMediaClient {
  constructor(database: MultipostDb) {
    super(database, "tiktok");
  }

  /**
   * Process account refresh for TikTok
   * @param accountId - Account ID to refresh
   * @returns Promise with processing result
   */
  async processRefreshAccount(
    accountId: string,
  ): Promise<TaskProcessingResult> {
    try {
      console.log(`🔄 Refreshing TikTok account: ${accountId}`);

      // Get account from database
      const account = await this.getAccount(accountId);
      if (!account) {
        return {
          success: false,
          message: `Account not found: ${accountId}`,
          error: "ACCOUNT_NOT_FOUND",
        };
      }

      console.log(
        `📋 Found account: ${account.platform} - ${
          account.username || account.displayName
        } (isActive=${account.isActive})`,
      );

      // Create TikTok API client
      const tiktokClient = new TikTokRefreshClient(account.accessToken);

      // Token is invalid, try to refresh it
      if (!account.refreshToken) {
        return {
          success: false,
          message: "No refresh token available for account",
          error: "NO_REFRESH_TOKEN",
        };
      }

      console.log(`🔄 Attempting to refresh TikTok token`);
      const refreshResponse = await tiktokClient.refreshToken(
        account.refreshToken,
      );

      const newAccessToken = refreshResponse.access_token;
      const newRefreshToken = refreshResponse.refresh_token;
      const expiresIn = refreshResponse.expires_in || 3600; // Default to 1 hour

      // Calculate new expiration time
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      // Update account with new tokens
      await this.updateAccountInfo(accountId, {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken || account.refreshToken,
        expiresAt: expiresAt,
      });

      console.log(
        `✅ TikTok token refreshed successfully, expires at: ${expiresAt}`,
      );

      // Validate the new token
      const newTiktokClient = new TikTokRefreshClient(newAccessToken);
      const newUserInfo = await newTiktokClient.validateToken();

      await this.updateAccountInfo(accountId, {
        isActive: true,
        username: newUserInfo.username || newUserInfo.display_name,
        displayName: newUserInfo.display_name,
        avatarUrl: newUserInfo.avatar_url,
        metadata: {
          ...newUserInfo,
          updatedAt: new Date().toISOString(),
        },
      });

      return {
        success: true,
        message: `TikTok account ${accountId} refreshed successfully`,
        data: { expiresAt, userInfo: newUserInfo },
      };
    } catch (error) {
      console.error(`❌ Error refreshing TikTok account ${accountId}:`, error);
      const message = getErrorMessage(error);

      // Mark account as inactive if refresh failed
      await this.markAccountInactive(accountId, `Refresh failed: ${message}`);

      return {
        success: false,
        message: `Error refreshing TikTok account: ${message}`,
        error: message,
      };
    }
  }

  /**
   * Process task status check for TikTok
   * @param logId - Publish task log ID
   * @param accessToken - Access token for the account
   * @returns Promise with processing result
   */
  async processCheckTask(
    logId: string,
    accessToken: string,
  ): Promise<TaskProcessingResult> {
    try {
      console.log(`🔍 Checking TikTok publish status for log: ${logId}`);

      // Get the publish task log to read publishData
      const log = await this.getPublishTaskLog(logId);
      if (!log || !log.publishData) {
        return {
          success: false,
          message: `No publish data found for log ${logId}`,
          error: "NO_PUBLISH_DATA",
        };
      }

      // Extract publishId from publishData
      const publishData = log.publishData as { data?: { publish_id?: string } };
      const publishId = publishData.data?.publish_id;

      if (!publishId) {
        return {
          success: false,
          message: `No publish ID found in publish data for log ${logId}`,
          error: "NO_PUBLISH_ID",
        };
      }

      // Create TikTok API client
      const tiktokClient = new TikTokPublishClient(accessToken);

      // Wait a bit for TikTok to process the publish request
      await new Promise((resolve) => setTimeout(resolve, 2000));

      console.log(`🔍 Checking publish status for ID: ${publishId}`);
      const statusResponse = await tiktokClient.checkPublishStatus(publishId);

      const status = statusResponse.data?.status;
      const failReason = statusResponse.data?.fail_reason;
      const postIds = statusResponse.data?.publicaly_available_post_id;
      const uploadedBytes = statusResponse.data?.uploaded_bytes;
      const downloadedBytes = statusResponse.data?.downloaded_bytes;

      console.log(`📊 Publish status: ${status}, fail reason: ${failReason}`);
      console.log(
        `📊 Uploaded bytes: ${uploadedBytes}, Downloaded bytes: ${downloadedBytes}`,
      );

      // Handle different status values based on TikTok API documentation
      let newStatus: string;
      let message: string;

      switch (status) {
        case "PUBLISH_COMPLETE":
          if (postIds && postIds.length > 0) {
            newStatus = "completed";
            message = postIds[0] || "Published successfully";
            console.log(
              `🎉 Publish log ${logId} completed successfully with post ID: ${
                postIds[0] || "unknown"
              }`,
            );
          } else {
            newStatus = "completed";
            message = "Published to creator inbox";
            console.log(
              `📬 Publish log ${logId} completed - content sent to creator inbox`,
            );
          }
          break;

        case "SEND_TO_USER_INBOX":
          newStatus = "processing";
          message = "Content sent to creator inbox";
          console.log(
            `📬 Publish log ${logId} - content sent to creator inbox for editing`,
          );
          break;

        case "PROCESSING_UPLOAD":
        case "PROCESSING_DOWNLOAD":
          newStatus = "processing";
          message = `Processing: ${status}`;
          console.log(`⏳ Publish log ${logId} is still processing: ${status}`);
          break;

        case "FAILED":
          newStatus = "failed";
          message = failReason || "Unknown error";
          console.log(`❌ Publish log ${logId} failed: ${failReason}`);
          break;

        default:
          newStatus = "processing";
          message = `Unknown status: ${status}`;
          console.log(`❓ Publish log ${logId} has unknown status: ${status}`);
          break;
      }

      // Update log status
      await this.updatePublishTaskLogStatus(
        logId,
        newStatus,
        message,
        statusResponse as JsonValue,
      );

      return {
        success: newStatus !== "failed",
        message: `Status check completed: ${message}`,
        data: { status: newStatus, statusResponse },
      };
    } catch (error) {
      console.error(
        `❌ Error checking TikTok publish status for log ${logId}:`,
        error,
      );
      const message = getErrorMessage(error);

      // Update log with error
      await this.updatePublishTaskLogStatus(logId, "failed", message);

      return {
        success: false,
        message: `Error checking TikTok publish status: ${message}`,
        error: message,
      };
    }
  }

  /**
   * Process a single publish task log
   * @param log - PublishTaskLog to process
   * @param publishTask - Parent PublishTask
   * @returns Promise with processing result
   */
  async processPublishTaskLog(
    logId: string,
    publishTask: PublishTask,
  ): Promise<TaskProcessingResult> {
    try {
      console.log(`🔄 Processing TikTok publish log ${logId}`);

      const log = await this.getPublishTaskLog(logId);
      if (!log) {
        return {
          success: false,
          message: `No publish task log found for ID: ${logId}`,
          error: "NO_PUBLISH_TASK_LOG",
        };
      }

      // Update log status to processing
      await this.db
        .update(PublishTaskLogTable)
        .set({ status: "processing", updatedAt: new Date() })
        .where(eq(PublishTaskLogTable.id, logId));

      // Get TikTok account from database
      const [tiktokAccount] = await this.db
        .select()
        .from(SocialMediaAccountTable)
        .where(
          and(
            eq(SocialMediaAccountTable.userId, log.userId),
            eq(SocialMediaAccountTable.platform, log.platform),
            eq(SocialMediaAccountTable.platformId, log.platformId),
            eq(SocialMediaAccountTable.isActive, true),
          ),
        )
        .limit(1);

      if (!tiktokAccount) {
        const errorMsg =
          `No active TikTok account found for userId=${log.userId}, platformId=${log.platformId}, platform=${log.platform}`;
        await this.updatePublishTaskLogStatus(logId, "failed", errorMsg);
        return {
          success: false,
          message: errorMsg,
          error: "NO_ACTIVE_ACCOUNT",
        };
      }

      // Create TikTok API client
      const tiktokClient = new TikTokPublishClient(tiktokAccount.accessToken);

      // Prepare post information
      const postInfo: TikTokPostInfo = {
        title: publishTask.draft.title || "",
        description: TikTokUtils.prepareDescription(
          publishTask.draft.content || "",
        ),
        disable_comment: false,
        privacy_level: "SELF_ONLY",
        auto_add_music: true,
      };

      // Prepare source information
      const sourceInfo: TikTokSourceInfo = {
        source: "PULL_FROM_URL",
        photo_cover_index: 0,
        photo_images: TikTokUtils.extractImageUrls(publishTask.draft.files),
      };

      // Initialize content publishing
      console.log(`🚀 Initializing TikTok content publishing for log ${logId}`);
      const initResponse = await tiktokClient.initContentPublish(
        postInfo,
        sourceInfo,
      );

      if (initResponse.data?.publish_id) {
        const publishId = initResponse.data.publish_id;
        console.log(`✅ TikTok publish initialized with ID: ${publishId}`);

        // Update log with publish ID and store initResponse
        await this.db
          .update(PublishTaskLogTable)
          .set({
            publishData: initResponse as JsonValue,
            updatedAt: new Date(),
          })
          .where(eq(PublishTaskLogTable.id, logId));

        console.log(
          `✅ TikTok publish initialized with ID: ${publishId}. Status checking will be handled separately.`,
        );

        return {
          success: true,
          message:
            `TikTok publish initialized successfully with ID: ${publishId}`,
          data: { publishId, initResponse },
        };
      } else {
        const errorMsg = "Failed to get publish ID from TikTok API response";
        await this.updatePublishTaskLogStatus(logId, "failed", errorMsg);
        return {
          success: false,
          message: errorMsg,
          error: "NO_PUBLISH_ID",
        };
      }
    } catch (error) {
      console.error(`❌ Error processing TikTok publish log ${logId}:`, error);
      const message = getErrorMessage(error);
      await this.updatePublishTaskLogStatus(logId, "failed", message);
      return {
        success: false,
        message: `Error processing TikTok publish log: ${message}`,
        error: message,
      };
    }
  }
}
