import { createServerFn } from '@tanstack/react-start';
import { VideoTranscription } from '@db/schema/schema';
import { and, desc, eq, inArray, type SQL } from 'drizzle-orm';

import { db } from '../../lib/db';
import { getSession } from '../../lib/session';
import {
  CreateTranscriptionSchema,
  VideoTranscriptionStatus,
  getVideoTranscriptionsByIdsSchema,
  listVideoTranscriptionsSchema,
  videoTranscriptionTaskIdSchema,
} from './types';

function andAll(conditions: (SQL | undefined)[]) {
  const filtered = conditions.filter((condition): condition is SQL => Boolean(condition));
  return filtered.length > 0 ? and(...filtered) : undefined;
}

/**
 * Create a new video transcription task.
 * The worker will pick up pending tasks automatically via database polling.
 */
export const createVideoTranscription = createServerFn({ method: 'POST' })
  .validator(CreateTranscriptionSchema)
  .handler(async ({ data }) => {
    try {
      const session = await getSession();
      if (!session?.user?.id) {
        return {
          success: false,
          error: '请先登录',
        };
      }

      const { videoUrl, videoId, platform, audioUrl, duration, metadata } = data;

      const [task] = await db
        .insert(VideoTranscription)
        .values({
          userId: session.user.id,
          videoUrl,
          videoId: videoId || null,
          platform: platform || null,
          audioUrl: audioUrl || null,
          duration: duration || null,
          metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
          status: VideoTranscriptionStatus.PENDING,
        })
        .returning();

      if (!task) {
        throw new Error('创建任务失败');
      }

      return {
        success: true,
        data: { id: task.id },
        message: '任务已创建，正在处理中...',
      };
    } catch (error) {
      console.error('createVideoTranscription error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '创建任务失败',
      };
    }
  });

/**
 * Get a single video transcription task by ID.
 */
export const getVideoTranscription = createServerFn({ method: 'GET' })
  .validator(videoTranscriptionTaskIdSchema)
  .handler(async ({ data }) => {
    try {
      const session = await getSession();
      if (!session?.user?.id) {
        return {
          success: false,
          error: '请先登录',
        };
      }

      const [task] = await db
        .select()
        .from(VideoTranscription)
        .where(and(eq(VideoTranscription.id, data.taskId), eq(VideoTranscription.userId, session.user.id)))
        .limit(1);

      if (!task) {
        return {
          success: false,
          error: '任务不存在',
        };
      }

      return {
        success: true,
        data: task,
      };
    } catch (error) {
      console.error('getVideoTranscription error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取任务失败',
      };
    }
  });

/**
 * List all video transcription tasks for the current user.
 */
export const listVideoTranscriptions = createServerFn({ method: 'GET' })
  .validator(listVideoTranscriptionsSchema)
  .handler(async ({ data }) => {
    try {
      const session = await getSession();
      if (!session?.user?.id) {
        return {
          success: false,
          error: '请先登录',
        };
      }

      const { status, limit = 20, offset = 0 } = data;

      const where = andAll([
        eq(VideoTranscription.userId, session.user.id),
        status ? eq(VideoTranscription.status, status) : undefined,
      ]);

      const [tasks, total] = await Promise.all([
        db
          .select()
          .from(VideoTranscription)
          .where(where)
          .orderBy(desc(VideoTranscription.createdAt))
          .limit(limit)
          .offset(offset),
        db.$count(VideoTranscription, where),
      ]);

      return {
        success: true,
        data: {
          tasks,
          total,
          hasMore: offset + tasks.length < total,
        },
      };
    } catch (error) {
      console.error('listVideoTranscriptions error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取任务列表失败',
      };
    }
  });

/**
 * Delete a video transcription task.
 */
export const deleteVideoTranscription = createServerFn({ method: 'POST' })
  .validator(videoTranscriptionTaskIdSchema)
  .handler(async ({ data }) => {
    try {
      const session = await getSession();
      if (!session?.user?.id) {
        return {
          success: false,
          error: '请先登录',
        };
      }

      const [task] = await db
        .select()
        .from(VideoTranscription)
        .where(and(eq(VideoTranscription.id, data.taskId), eq(VideoTranscription.userId, session.user.id)))
        .limit(1);

      if (!task) {
        return {
          success: false,
          error: '任务不存在',
        };
      }

      if (task.status === VideoTranscriptionStatus.PROCESSING) {
        return {
          success: false,
          error: '任务正在处理中，无法删除',
        };
      }

      await db.delete(VideoTranscription).where(eq(VideoTranscription.id, data.taskId));

      return {
        success: true,
        message: '任务已删除',
      };
    } catch (error) {
      console.error('deleteVideoTranscription error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除任务失败',
      };
    }
  });

/**
 * Get multiple video transcription tasks by IDs for polling optimization.
 */
export const getVideoTranscriptionsByIds = createServerFn({ method: 'GET' })
  .validator(getVideoTranscriptionsByIdsSchema)
  .handler(async ({ data }) => {
    try {
      const session = await getSession();
      if (!session?.user?.id) {
        return {
          success: false,
          error: '请先登录',
        };
      }

      if (data.taskIds.length === 0) {
        return {
          success: true,
          data: [],
        };
      }

      const tasks = await db
        .select()
        .from(VideoTranscription)
        .where(
          and(
            inArray(VideoTranscription.id, data.taskIds),
            eq(VideoTranscription.userId, session.user.id),
          ),
        );

      return {
        success: true,
        data: tasks,
      };
    } catch (error) {
      console.error('getVideoTranscriptionsByIds error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '批量获取任务失败',
      };
    }
  });

/**
 * Retry a failed video transcription task.
 */
export const retryVideoTranscription = createServerFn({ method: 'POST' })
  .validator(videoTranscriptionTaskIdSchema)
  .handler(async ({ data }) => {
    try {
      const session = await getSession();
      if (!session?.user?.id) {
        return {
          success: false,
          error: '请先登录',
        };
      }

      const [task] = await db
        .select()
        .from(VideoTranscription)
        .where(and(eq(VideoTranscription.id, data.taskId), eq(VideoTranscription.userId, session.user.id)))
        .limit(1);

      if (!task) {
        return {
          success: false,
          error: '任务不存在',
        };
      }

      if (task.status !== VideoTranscriptionStatus.FAILED) {
        return {
          success: false,
          error: '只能重试失败的任务',
        };
      }

      await db
        .update(VideoTranscription)
        .set({
          status: VideoTranscriptionStatus.PENDING,
          error: null,
          updatedAt: new Date(),
        })
        .where(eq(VideoTranscription.id, data.taskId));

      return {
        success: true,
        message: '任务已重新排队',
      };
    } catch (error) {
      console.error('retryVideoTranscription error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '重试任务失败',
      };
    }
  });
