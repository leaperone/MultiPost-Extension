/**
 * @file Facebook Pages Client
 * @description Facebook Pages platform client implementation for publishing and status checks
 */

import { and, eq } from "drizzle-orm";
import type { JsonValue } from "@db/helpers.ts";
import {
  PublishTaskLog as PublishTaskLogTable,
  SocialMediaAccount as SocialMediaAccountTable,
} from "@db/schema/index.ts";
import {
  BaseSocialMediaClient,
  PublishTask,
  TaskProcessingResult,
} from "./base.ts";
import type { MultipostDb } from "../db.ts";

type GraphError = {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
};

type GraphErrorResponse = {
  error?: GraphError;
};

type GraphPhotoResponse = {
  id: string;
};

type GraphPostResponse = {
  id: string;
};

type GraphPostDetails = {
  id: string;
  message?: string;
  created_time?: string;
  permalink_url?: string;
};

interface PublishResponses {
  photos: GraphPhotoResponse[];
  post: GraphPostResponse;
}

/**
 * Facebook Pages platform client implementation
 */
export class FacebookPagesClient extends BaseSocialMediaClient {
  private readonly graphApiBaseUrl = "https://graph.facebook.com/v23.0";

  constructor(database: MultipostDb) {
    super(database, "facebook-pages");
  }

  async processPublishTaskLog(
    logId: string,
    publishTask: PublishTask,
  ): Promise<TaskProcessingResult> {
    try {
      console.log(`🔄 Processing Facebook Pages publish log ${logId}`);

      const log = await this.getPublishTaskLog(logId);
      if (!log) {
        return {
          success: false,
          message: `No publish task log found for ID: ${logId}`,
          error: "NO_PUBLISH_TASK_LOG",
        };
      }

      // Update log status to processing (idempotent)
      await this.db
        .update(PublishTaskLogTable)
        .set({ status: "processing", updatedAt: new Date() })
        .where(eq(PublishTaskLogTable.id, logId));

      const [account] = await this.db
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

      if (!account) {
        const errorMsg =
          `No active Facebook Pages account found for userId=${publishTask.userId}, platformId=${log.platformId}`;
        await this.updatePublishTaskLogStatus(log.id, "failed", errorMsg);
        return {
          success: false,
          message: errorMsg,
          error: "NO_ACTIVE_ACCOUNT",
        };
      }

      const message = this.buildPostMessage(publishTask);
      const imageUrls = this.extractImageUrls(publishTask.draft.files);

      const photoResponses: GraphPhotoResponse[] = [];
      if (imageUrls.length > 0) {
        console.log(
          `📸 Uploading ${imageUrls.length} image(s) for Facebook Pages post`,
        );
        for (const imageUrl of imageUrls) {
          try {
            const uploadResponse = await this.uploadPhoto(
              log.platformId,
              account.accessToken,
              imageUrl,
            );
            photoResponses.push(uploadResponse);
            console.log(
              `✅ Uploaded photo for Facebook Pages post: ${uploadResponse.id}`,
            );
          } catch (uploadError) {
            console.error(
              `❌ Failed to upload photo ${imageUrl}:`,
              uploadError,
            );
            throw uploadError;
          }
        }
      }

      console.log(`🚀 Creating Facebook Pages feed post for log ${log.id}`);
      const postResponse = await this.createFeedPost(
        log.platformId,
        account.accessToken,
        message,
        photoResponses,
      );

      const publishResponses: PublishResponses = {
        photos: photoResponses,
        post: postResponse,
      };

      await this.db
        .update(PublishTaskLogTable)
        .set({
          publishData: publishResponses as unknown as JsonValue,
          error: null,
          message: null,
          updatedAt: new Date(),
        })
        .where(eq(PublishTaskLogTable.id, log.id));

      return {
        success: true,
        message:
          `Facebook Pages post queued for verification (${postResponse.id})`,
        data: publishResponses,
      };
    } catch (error) {
      console.error(
        `❌ Error processing Facebook Pages publish log ${logId}:`,
        error,
      );
      await this.updatePublishTaskLogStatus(
        logId,
        "failed",
        error instanceof Error ? error.message : String(error),
      );
      return {
        success: false,
        message: `Error processing Facebook Pages publish log: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async processCheckTask(
    logId: string,
    accessToken: string,
  ): Promise<TaskProcessingResult> {
    try {
      console.log(
        `🔍 Checking Facebook Pages publish status for log: ${logId}`,
      );

      const log = await this.getPublishTaskLog(logId);
      if (!log || !log.publishData) {
        return {
          success: false,
          message: `No publish data found for Facebook Pages log ${logId}`,
          error: "NO_PUBLISH_DATA",
        };
      }

      const publishData = log.publishData as unknown as PublishResponses;
      const postId = publishData?.post?.id;

      if (!postId) {
        return {
          success: false,
          message: `No Facebook post ID found in publish data for log ${logId}`,
          error: "NO_POST_ID",
        };
      }

      const postDetails = await this.getPostDetails(postId, accessToken);
      const link = postDetails.permalink_url ??
        `https://www.facebook.com/${postId}`;

      const resultPayload = {
        ...postDetails,
        link,
      } satisfies GraphPostDetails & { link: string };

      await this.updatePublishTaskLogStatus(
        logId,
        "completed",
        "Facebook Pages post verified",
        resultPayload,
      );

      return {
        success: true,
        message: `Facebook Pages post verified successfully`,
        data: resultPayload,
      };
    } catch (error) {
      console.error(
        `❌ Error checking Facebook Pages publish status for log ${logId}:`,
        error,
      );
      await this.updatePublishTaskLogStatus(
        logId,
        "failed",
        error instanceof Error ? error.message : String(error),
      );
      return {
        success: false,
        message: `Error checking Facebook Pages publish status: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async processRefreshAccount(): Promise<TaskProcessingResult> {
    return {
      success: false,
      message: "Facebook Pages refresh not implemented",
      error: "NOT_IMPLEMENTED",
    };
  }

  private extractImageUrls(files: unknown): string[] {
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

  private buildPostMessage(publishTask: PublishTask): string {
    const rawContent = publishTask.draft.content || publishTask.draft.title ||
      "";
    const cleaned = rawContent.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ")
      .trim();

    if (cleaned.length > 0) {
      return cleaned;
    }

    return "Shared via SaraClick";
  }

  private async uploadPhoto(
    pageId: string,
    accessToken: string,
    imageUrl: string,
  ): Promise<GraphPhotoResponse> {
    const endpoint = `${this.graphApiBaseUrl}/${pageId}/photos`;
    const payload = {
      url: imageUrl,
      published: false,
    };

    return await this.performGraphPost<GraphPhotoResponse>(
      endpoint,
      accessToken,
      payload,
    );
  }

  private async createFeedPost(
    pageId: string,
    accessToken: string,
    message: string,
    photoResponses: GraphPhotoResponse[],
  ): Promise<GraphPostResponse> {
    const endpoint = `${this.graphApiBaseUrl}/${pageId}/feed`;
    const payload: Record<string, unknown> = {
      message,
      published: true,
    };

    if (photoResponses.length > 0) {
      payload.attached_media = photoResponses.map((photo) => ({
        media_fbid: photo.id,
      }));
    }

    return await this.performGraphPost<GraphPostResponse>(
      endpoint,
      accessToken,
      payload,
    );
  }

  private async getPostDetails(
    postId: string,
    accessToken: string,
  ): Promise<GraphPostDetails> {
    const endpoint =
      `${this.graphApiBaseUrl}/${postId}?fields=created_time,message,permalink_url`;
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    const text = await response.text();
    const data = this.parseGraphResponse<GraphPostDetails>(
      response.status,
      text,
    );
    if (!data.id) {
      throw new Error("Facebook Graph API did not return a post id");
    }

    return data;
  }

  private async performGraphPost<T>(
    endpoint: string,
    accessToken: string,
    payload: Record<string, unknown>,
  ): Promise<T> {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    const data = this.parseGraphResponse<T>(response.status, text);
    return data;
  }

  private parseGraphResponse<T>(status: number, rawBody: string): T {
    let parsed: (T & GraphErrorResponse) | GraphErrorResponse;

    try {
      parsed = rawBody
        ? (JSON.parse(rawBody) as T & GraphErrorResponse)
        : ({} as T & GraphErrorResponse);
    } catch {
      throw new Error(`Facebook Graph API error (${status}): ${rawBody}`);
    }

    if ("error" in parsed && parsed.error) {
      const err = parsed.error;
      const message = `Facebook Graph API error${
        err.code ? ` (${err.code})` : ""
      }: ${err.message || "Unknown error"}`;
      throw new Error(message);
    }

    return parsed as T;
  }
}
