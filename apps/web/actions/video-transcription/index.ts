'use server';

import { multipostDb } from '@/lib/db';
import { auth } from '@/auth';
import {
  VideoTranscriptionStatus,
  CreateTranscriptionSchema,
  type CreateTranscriptionInput,
} from './types';

/**
 * Create a new video transcription task
 * The worker will pick up pending tasks automatically via database polling
 */
export async function createVideoTranscription(input: CreateTranscriptionInput) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: '请先登录',
      };
    }

    // Validate input
    const parseResult = CreateTranscriptionSchema.safeParse(input);
    if (!parseResult.success) {
      return {
        success: false,
        error: parseResult.error.issues[0]?.message || '参数校验失败',
      };
    }

    const { videoUrl, videoId, platform, audioUrl, duration, metadata } = parseResult.data;

    // Create database record with pre-extracted video info
    // Worker will pick it up automatically
    const task = await multipostDb.videoTranscription.create({
      data: {
        userId: session.user.id,
        videoUrl,
        videoId: videoId || null,
        platform: platform || null,
        audioUrl: audioUrl || null,
        duration: duration || null,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
        status: VideoTranscriptionStatus.PENDING,
      },
    });

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
}

/**
 * Get a single video transcription task by ID
 */
export async function getVideoTranscription(taskId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: '请先登录',
      };
    }

    const task = await multipostDb.videoTranscription.findFirst({
      where: {
        id: taskId,
        userId: session.user.id,
      },
    });

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
}

/**
 * List all video transcription tasks for the current user
 */
export async function listVideoTranscriptions(options?: {
  status?: string;
  limit?: number;
  offset?: number;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: '请先登录',
      };
    }

    const { status, limit = 20, offset = 0 } = options || {};

    const where: { userId: string; status?: string } = {
      userId: session.user.id,
    };

    if (status) {
      where.status = status;
    }

    const [tasks, total] = await Promise.all([
      multipostDb.videoTranscription.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      multipostDb.videoTranscription.count({ where }),
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
}

/**
 * Delete a video transcription task
 */
export async function deleteVideoTranscription(taskId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: '请先登录',
      };
    }

    // Check ownership
    const task = await multipostDb.videoTranscription.findFirst({
      where: {
        id: taskId,
        userId: session.user.id,
      },
    });

    if (!task) {
      return {
        success: false,
        error: '任务不存在',
      };
    }

    // Don't allow deleting processing tasks
    if (task.status === VideoTranscriptionStatus.PROCESSING) {
      return {
        success: false,
        error: '任务正在处理中，无法删除',
      };
    }

    await multipostDb.videoTranscription.delete({
      where: { id: taskId },
    });

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
}

/**
 * Get multiple video transcription tasks by IDs (for polling optimization)
 */
export async function getVideoTranscriptionsByIds(taskIds: string[]) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: '请先登录',
      };
    }

    if (taskIds.length === 0) {
      return {
        success: true,
        data: [],
      };
    }

    const tasks = await multipostDb.videoTranscription.findMany({
      where: {
        id: { in: taskIds },
        userId: session.user.id,
      },
    });

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
}

/**
 * Retry a failed video transcription task
 */
export async function retryVideoTranscription(taskId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: '请先登录',
      };
    }

    // Check ownership and status
    const task = await multipostDb.videoTranscription.findFirst({
      where: {
        id: taskId,
        userId: session.user.id,
      },
    });

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

    // Reset task to pending - worker will pick it up
    await multipostDb.videoTranscription.update({
      where: { id: taskId },
      data: {
        status: VideoTranscriptionStatus.PENDING,
        error: null,
      },
    });

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
}
