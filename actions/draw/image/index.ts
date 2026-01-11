'use server';

import { multipostDb } from '@/lib/db';
import { ImageGenerationStatus, ImageGenerationSchema, getPrompt } from '@/actions/draw/image/types';
import { auth } from '@/auth';
import {
  createImageGeneration as createLeaperOneTask,
  convertImageSize,
  getGenerationStatus,
} from '@/lib/leaperone';
// import { preCheckCredit } from '@/actions/credit';
// import { PRICING } from '@/actions/credit/types';

/**
 * 创建新的图片生成任务
 * @description 验证用户权限，检查积分，处理提示词，调用 LeaperOne API 创建任务
 * @param {ImageGenerationSchema} task - 图片生成任务参数
 * @returns {Promise<{success: boolean, data?: {id: string, leaperOneId: string}, error?: string}>}
 */
export async function newImageGeneration(task: ImageGenerationSchema) {
  try {
    const session = await auth();
    if (!session?.user || !session.user.id) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    // 用 zod 校验 task
    const parseResult = ImageGenerationSchema.safeParse(task);
    if (!parseResult.success) {
      return {
        success: false,
        error: '参数校验失败',
        issues: parseResult.error.issues,
      };
    }
    const validatedTask = parseResult.data;

    // 检查积分是否足够
    // if (!(await preCheckCredit(session.user.id, PRICING.IMAGE_GENERATION.mul(validatedTask.number).toNumber()))) {
    //   return {
    //     success: false,
    //     error: '积分不足',
    //   };
    // }

    // 使用 getPrompt 拼接 composition、color、style 的提示词
    let extraPrompt = validatedTask.prompt;
    if (validatedTask.composition) {
      const compositionPrompt = getPrompt('composition', validatedTask.composition);
      if (compositionPrompt) extraPrompt = `${compositionPrompt}\n${extraPrompt}`;
    }
    if (validatedTask.color) {
      const colorPrompt = getPrompt('color', validatedTask.color);
      if (colorPrompt) extraPrompt = `${colorPrompt}\n${extraPrompt}`;
    }
    if (validatedTask.style) {
      const stylePrompt = getPrompt('style', validatedTask.style);
      if (stylePrompt) extraPrompt = `${stylePrompt}\n${extraPrompt}`;
    }

    // 转换尺寸格式
    const leaperOneSize = convertImageSize(validatedTask.size);

    // 调用 LeaperOne API 创建生成任务
    const leaperOneId = await createLeaperOneTask({
      prompt: extraPrompt,
      size: leaperOneSize,
      number: validatedTask.number,
      referenceImages: validatedTask.images,
    });

    // 创建数据库记录，保存 leaperOneId 到 workflowId 字段
    const newTask = await multipostDb.imageGeneration.create({
      data: {
        userId: session.user.id,
        prompt: validatedTask.prompt,
        extraPrompt,
        images: validatedTask.images || [],
        number: validatedTask.number,
        size: validatedTask.size.toString(),
        status: ImageGenerationStatus.PROCESSING,
        workflowId: leaperOneId,
      },
    });

    console.log(`Created image generation task ${newTask.id} with LeaperOne ID ${leaperOneId}`);

    return {
      success: true,
      data: { id: newTask.id, leaperOneId },
      message: 'Task created successfully',
    };
  } catch (error) {
    console.error('newImageGeneration error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function listAllImages() {
  try {
    const session = await auth();
    if (!session?.user || !session.user.id) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const result = await multipostDb.imageGeneration.findMany({
      where: {
        userId: session.user.id,
        status: ImageGenerationStatus.COMPLETED,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        ImageGenerationLog: {
          include: {
            fileHosting: true,
          },
        },
      },
    });
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('listAllImages error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getImageGeneration(taskId: string) {
  try {
    const task = await multipostDb.imageGeneration.findUnique({
      where: {
        id: taskId,
      },
      include: {
        ImageGenerationLog: {
          include: {
            fileHosting: true,
          },
        },
      },
    });

    if (!task) {
      return {
        success: false,
        error: 'Task not found',
      };
    }

    return {
      success: true,
      data: task,
    };
  } catch (error) {
    console.error('getImageGeneration error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function updateImageGeneration(id: string) {
  try {
    const result = await multipostDb.imageGeneration.findUnique({
      where: { id },
    });

    if (!result) {
      return {
        success: false,
        error: 'Image generation not found',
      };
    }

    if (result.status === ImageGenerationStatus.COMPLETED) {
      return {
        success: true,
        data: result,
        message: 'Task already completed',
      };
    }

    if (result.status === ImageGenerationStatus.FAILED) {
      return {
        success: true,
        data: result,
        message: 'Task already failed',
      };
    }

    return {
      success: true,
      data: result,
      message: 'Task is still processing',
    };
  } catch (error) {
    console.error('updateImageGeneration error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 查询 LeaperOne 图片生成状态
 * @param leaperOneId - LeaperOne 任务 ID
 */
export async function checkLeaperOneStatus(leaperOneId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    // 验证任务属于当前用户
    const task = await multipostDb.imageGeneration.findFirst({
      where: {
        workflowId: leaperOneId,
        userId: session.user.id,
      },
    });

    if (!task) {
      return { success: false, error: 'Task not found' };
    }

    // 查询 LeaperOne 状态
    const status = await getGenerationStatus(leaperOneId);

    return {
      success: true,
      data: {
        taskId: task.id,
        leaperOneId,
        status: status.status,
        images: status.images,
        error: status.error,
      },
    };
  } catch (error) {
    console.error('checkLeaperOneStatus error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 完成图片生成任务
 * @param taskId - 数据库任务 ID
 * @param images - 生成的图片列表
 */
export async function completeImageGeneration(
  taskId: string,
  images: Array<{ id?: string; url?: string }>,
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    // 验证任务属于当前用户
    const task = await multipostDb.imageGeneration.findFirst({
      where: {
        id: taskId,
        userId: session.user.id,
      },
    });

    if (!task) {
      return { success: false, error: 'Task not found' };
    }

    // 保存图片 URL 到 ImageGenerationLog
    for (const image of images) {
      if (!image.url) continue;

      // LeaperOne 图片预览 URL：原始 URL + !style=imagePreview
      const previewUrl = `${image.url}!style=imagePreview`;

      await multipostDb.imageGenerationLog.create({
        data: {
          userId: session.user.id,
          imageGenerationId: taskId,
          url: image.url,
          previewUrl,
          response: { source: 'leaperone', imageId: image.id },
        },
      });
    }

    // 更新任务状态为完成
    await multipostDb.imageGeneration.update({
      where: { id: taskId },
      data: { status: ImageGenerationStatus.COMPLETED },
    });

    return {
      success: true,
      data: { taskId },
    };
  } catch (error) {
    console.error('completeImageGeneration error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 标记图片生成任务失败
 * @param taskId - 数据库任务 ID
 * @param errorMessage - 错误信息
 */
export async function failImageGeneration(taskId: string, errorMessage: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    // 验证任务属于当前用户
    const task = await multipostDb.imageGeneration.findFirst({
      where: {
        id: taskId,
        userId: session.user.id,
      },
    });

    if (!task) {
      return { success: false, error: 'Task not found' };
    }

    // 更新任务状态为失败
    await multipostDb.imageGeneration.update({
      where: { id: taskId },
      data: {
        status: ImageGenerationStatus.FAILED,
        message: errorMessage,
      },
    });

    return {
      success: true,
      data: { taskId },
    };
  } catch (error) {
    console.error('failImageGeneration error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
