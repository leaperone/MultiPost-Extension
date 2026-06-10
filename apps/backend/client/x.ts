/**
 * @file X (Twitter) Client
 * @description X platform client implementation
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

// X API response interfaces
export interface XPostInfo {
  text: string;
  reply?: {
    in_reply_to_tweet_id: string;
  };
  quote_tweet_id?: string;
  poll?: {
    options: string[];
    duration_minutes: number;
  };
  media?: {
    media_ids: string[];
    tagged_user_ids?: string[];
  };
}

export interface XApiResponse {
  data: {
    id: string;
    text: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface XStatusResponse {
  data: {
    id: string;
    text: string;
    created_at: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface XMediaUploadResponse {
  data: {
    id: string;
    media_key: string;
    size: number;
    expires_after_secs: number;
    image?: {
      image_type: string;
      w: number;
      h: number;
    };
  };
}

/**
 * X platform client implementation
 */
export class XClient extends BaseSocialMediaClient {
  private baseUrl = "https://api.x.com/2";
  private uploadUrl = "https://api.x.com/2";
  private clientId = process.env.X_CLIENT_ID || "";
  private clientSecret = process.env.X_CLIENT_SECRET || "";

  constructor(database: MultipostDb) {
    super(database, "x");
  }

  /**
   * Process account refresh for X
   * @param accountId - Account ID to refresh
   * @returns Promise with processing result
   */
  async processRefreshAccount(
    accountId: string,
  ): Promise<TaskProcessingResult> {
    try {
      console.log(`🔄 Refreshing X account: ${accountId}`);

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
        `📋 Found X account: ${
          account.username || account.displayName
        } (isActive=${account.isActive})`,
      );

      // Check if account has refresh token
      if (!account.refreshToken) {
        return {
          success: false,
          message: "No refresh token available for account",
          error: "NO_REFRESH_TOKEN",
        };
      }

      // Refresh X token using X API
      console.log(`🔄 Attempting to refresh X token`);
      const refreshResponse = await this.refreshXToken(account.refreshToken);

      const newAccessToken = refreshResponse.access_token;
      const newRefreshToken = refreshResponse.refresh_token;
      const expiresIn = refreshResponse.expires_in || 7200; // Default to 2 hours for X

      // Calculate new expiration time
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      // Update account with new tokens and expiration time
      await this.updateAccountInfo(accountId, {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken || account.refreshToken,
        expiresAt: expiresAt,
        isActive: true,
      });

      console.log(
        `✅ X token refreshed successfully, expires at: ${expiresAt}`,
      );

      return {
        success: true,
        message: `X account ${accountId} refreshed successfully`,
        data: { platform: "x", expiresAt },
      };
    } catch (error) {
      console.error(`❌ Error refreshing X account ${accountId}:`, error);
      const message = getErrorMessage(error);

      // Mark account as inactive if refresh failed
      await this.markAccountInactive(accountId, `Refresh failed: ${message}`);

      return {
        success: false,
        message: `Error refreshing X account: ${message}`,
        error: message,
      };
    }
  }

  /**
   * Process task status check for X
   * @param logId - Publish task log ID
   * @param accessToken - Access token for the account
   * @returns Promise with processing result
   */
  async processCheckTask(
    logId: string,
    accessToken: string,
  ): Promise<TaskProcessingResult> {
    try {
      console.log(`🔍 Checking X publish status for log: ${logId}`);

      // Get the publish task log to read publishData
      const log = await this.getPublishTaskLog(logId);
      if (!log || !log.publishData) {
        return {
          success: false,
          message: `No publish data found for X log ${logId}`,
          error: "NO_PUBLISH_DATA",
        };
      }

      // Extract tweet ID from publishData
      const publishData = log.publishData as { data?: { id?: string } };
      const tweetId = publishData.data?.id;

      if (!tweetId) {
        return {
          success: false,
          message: `No tweet ID found in publish data for X log ${logId}`,
          error: "NO_TWEET_ID",
        };
      }

      // Check tweet status using X API
      const statusResponse = await this.getTweetStatus(tweetId, accessToken);

      if (statusResponse.data) {
        // Tweet exists, mark as completed
        await this.updatePublishTaskLogStatus(
          logId,
          "completed",
          "X post published successfully",
          statusResponse as JsonValue,
        );

        return {
          success: true,
          message: `X status check completed successfully`,
          data: { status: "completed", tweetId, statusResponse },
        };
      } else {
        // Tweet not found, mark as failed
        await this.updatePublishTaskLogStatus(
          logId,
          "failed",
          "Tweet not found on X",
        );

        return {
          success: false,
          message: `Tweet not found on X: ${tweetId}`,
          error: "TWEET_NOT_FOUND",
        };
      }
    } catch (error) {
      console.error(
        `❌ Error checking X publish status for log ${logId}:`,
        error,
      );
      const message = getErrorMessage(error);

      // Update log with error
      await this.updatePublishTaskLogStatus(logId, "failed", message);

      return {
        success: false,
        message: `Error checking X publish status: ${message}`,
        error: message,
      };
    }
  }

  /**
   * Process a single X publish task log
   * @param log - PublishTaskLog to process
   * @param publishTask - Parent PublishTask
   * @returns Promise with processing result
   */
  async processPublishTaskLog(
    logId: string,
    publishTask: PublishTask,
  ): Promise<TaskProcessingResult> {
    try {
      console.log(`🔄 Processing X publish log ${logId}`);

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

      // Get X account from database
      const [xAccount] = await this.db
        .select()
        .from(SocialMediaAccountTable)
        .where(
          and(
            eq(SocialMediaAccountTable.userId, publishTask.userId),
            eq(SocialMediaAccountTable.platform, log.platform),
            eq(SocialMediaAccountTable.platformId, log.platformId),
            eq(SocialMediaAccountTable.isActive, true),
          ),
        )
        .limit(1);

      if (!xAccount) {
        const errorMsg =
          `No active X account found for userId=${publishTask.userId}, platformId=${log.platformId}, platform=${log.platform}`;
        await this.updatePublishTaskLogStatus(log.id, "failed", errorMsg);
        return {
          success: false,
          message: errorMsg,
          error: "NO_ACTIVE_ACCOUNT",
        };
      }

      // Prepare tweet content
      const tweetText = this.prepareTweetText(publishTask.draft.content || "");

      // Upload media if available
      let mediaIds: string[] = [];
      if (publishTask.draft.files) {
        try {
          mediaIds = await this.uploadMediaFiles(
            publishTask.draft.files,
            xAccount.accessToken,
          );
          console.log(`📸 Uploaded ${mediaIds.length} media files for X`);
        } catch (error) {
          console.warn(
            `⚠️  Failed to upload media for X: ${getErrorMessage(error)}`,
          );
          // Continue without media
        }
      }

      // Post tweet to X
      console.log(`🚀 Posting tweet to X for log ${log.id}`);
      const tweetResponse = await this.postTweet(
        tweetText,
        xAccount.accessToken,
        mediaIds,
      );

      if (tweetResponse.data?.id) {
        const tweetId = tweetResponse.data.id;
        console.log(`✅ X tweet posted successfully with ID: ${tweetId}`);

        // Update log with tweet response
        await this.db
          .update(PublishTaskLogTable)
          .set({
            publishData: tweetResponse as JsonValue,
            status: "completed",
            publishedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(PublishTaskLogTable.id, log.id));

        return {
          success: true,
          message: `X tweet posted successfully with ID: ${tweetId}`,
          data: { tweetId, tweetResponse },
        };
      } else {
        throw new Error("Failed to get tweet ID from X API response");
      }
    } catch (error) {
      console.error(`❌ Error processing X publish log ${logId}:`, error);
      const message = getErrorMessage(error);
      await this.updatePublishTaskLogStatus(logId, "failed", message);
      return {
        success: false,
        message: `Error processing X publish log: ${message}`,
        error: message,
      };
    }
  }

  /**
   * Prepare tweet text from draft content
   * @param content - Draft content
   * @returns Formatted tweet text
   */
  private prepareTweetText(content: string): string {
    // Remove HTML tags and clean up content
    let text = content.replace(/<[^>]*>/g, "");

    // Truncate to X character limit (280 characters)
    if (text.length > 280) {
      text = text.substring(0, 277) + "...";
    }

    return text.trim();
  }

  /**
   * Upload media files to X
   * @param files - Media files from draft
   * @param accessToken - Access token
   * @returns Promise with array of media IDs
   */
  private async uploadMediaFiles(
    files: unknown,
    accessToken: string,
  ): Promise<string[]> {
    const mediaIds: string[] = [];

    // Convert files to array if it's not already
    const fileArray = Array.isArray(files) ? files : [files];

    for (const file of fileArray) {
      try {
        // Extract file URL or data from the file object
        const fileUrl = this.extractFileUrl(file);
        if (!fileUrl) {
          console.warn(
            `⚠️  Could not extract file URL from: ${JSON.stringify(file)}`,
          );
          continue;
        }

        // Download file data
        const fileData = await this.downloadFile(fileUrl);

        // Upload to X
        const mediaId = await this.uploadMedia(fileData, accessToken);
        mediaIds.push(mediaId);

        console.log(`📸 Uploaded media file: ${mediaId}`);
      } catch (error) {
        console.error(
          `❌ Failed to upload media file: ${getErrorMessage(error)}`,
        );
        // Continue with other files
      }
    }

    return mediaIds;
  }

  /**
   * Extract file URL from file object
   * @param file - File object
   * @returns File URL or null
   */
  private extractFileUrl(file: unknown): string | null {
    if (typeof file === "string") {
      return file;
    }

    if (typeof file === "object" && file !== null) {
      const fileObj = file as Record<string, unknown>;
      return (fileObj.url as string) || (fileObj.path as string) || null;
    }

    return null;
  }

  /**
   * Download file from URL
   * @param url - File URL
   * @returns Promise with file data as ArrayBuffer
   */
  private async downloadFile(url: string): Promise<ArrayBuffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to download file: ${response.status} ${response.statusText}`,
      );
    }
    return await response.arrayBuffer();
  }

  /**
   * Upload media to X using simple multipart upload
   * @param fileData - File data as ArrayBuffer
   * @param accessToken - Access token
   * @returns Promise with media ID
   */
  private async uploadMedia(
    fileData: ArrayBuffer,
    accessToken: string,
  ): Promise<string> {
    const url = `${this.uploadUrl}/media/upload`;

    // Create form data with media file
    const formData = new FormData();
    formData.append("media", new Blob([fileData]), "media.jpeg");
    formData.append("media_category", "tweet_image");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `X media upload error: ${response.status} - ${errorText}`,
      );
    }

    const result: XMediaUploadResponse = await response.json();
    return result.data.id;
  }

  /**
   * Make a request to X API
   * @param url - API endpoint URL
   * @param options - Fetch options
   * @returns Promise with the response
   */
  private async makeRequest(
    url: string,
    options: RequestInit,
  ): Promise<Response> {
    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`X API error: ${response.status} - ${errorText}`);
    }

    return response;
  }

  /**
   * Post a tweet to X
   * @param text - Tweet text
   * @param accessToken - Access token
   * @param mediaIds - Optional media IDs to attach
   * @returns Promise with the response
   */
  async postTweet(
    text: string,
    accessToken: string,
    mediaIds?: string[],
  ): Promise<XApiResponse> {
    const url = `${this.baseUrl}/tweets`;

    const tweetData: Record<string, unknown> = {
      text: text.substring(0, 280), // X character limit
    };

    // Add media if provided
    if (mediaIds && mediaIds.length > 0) {
      tweetData.media = {
        media_ids: mediaIds,
      };
    }

    const response = await this.makeRequest(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tweetData),
    });

    return await response.json();
  }

  /**
   * Get tweet status from X
   * @param tweetId - Tweet ID
   * @param accessToken - Access token
   * @returns Promise with the status response
   */
  async getTweetStatus(
    tweetId: string,
    accessToken: string,
  ): Promise<XStatusResponse> {
    const url = `${this.baseUrl}/tweets/${tweetId}`;

    const response = await this.makeRequest(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return await response.json();
  }

  /**
   * Refresh X access token using refresh token
   * @param refreshToken - Refresh token
   * @returns Promise with the token response
   */
  async refreshXToken(refreshToken: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    // Check if client credentials are available
    if (!this.clientId || !this.clientSecret) {
      throw new Error(
        "X_CLIENT_ID and X_CLIENT_SECRET environment variables are required",
      );
    }

    const url = "https://api.x.com/2/oauth2/token";

    const formData = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${
          Buffer.from(`${this.clientId}:${this.clientSecret}`).toString(
            "base64",
          )
        }`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("X token refresh failed:", errorData);
      throw new Error(`X token refresh failed: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token || refreshToken, // Fallback to old refresh token if not provided
      expires_in: data.expires_in || 7200, // Default to 2 hours
    };
  }
}
