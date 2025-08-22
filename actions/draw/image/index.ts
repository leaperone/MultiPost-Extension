'use server';

import {  multipostDb } from '@/lib/db';
import { ImageGenerationStatus, ImageGenerationSchema, getPrompt } from '@/actions/draw/image/types';
import { auth } from '@/auth';
// import { preCheckCredit } from '@/actions/credit';
// import { PRICING } from '@/actions/credit/types';

/**
 * 创建新的图片生成任务
 * @description 验证用户权限，检查积分，处理提示词，创建数据库记录
 * @param {ImageGenerationSchema} task - 图片生成任务参数
 * @returns {Promise<{success: boolean, data?: {id: string}, error?: string}>}
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
    if (validatedTask.size) {
      extraPrompt = `size: ${validatedTask.size}\n${extraPrompt}`;
    }
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

    // 创建数据库记录
    const newTask = await multipostDb.imageGeneration.create({
      data: {
        userId: session.user.id,
        prompt: validatedTask.prompt,
        extraPrompt,
        images: validatedTask.images || [],
        number: validatedTask.number,
        size: validatedTask.size.toString(),
        status: ImageGenerationStatus.PENDING,
      },
    });

    await triggerImageGeneration(newTask.id);

    return {
      success: true,
      data: { id: newTask.id },
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

export async function triggerImageGeneration(taskId: string) {
  const task = await multipostDb.imageGeneration.findUnique({
    where: {
      id: taskId,
    },
  });
  if (!task) {
    return {
      success: false,
      error: 'Task not found',
    };
  }

  // 调用backend worker处理任务
  const backendUrl = process.env.DENO_URL || 'http://localhost:9000';

  try {
    const response = await fetch(`${backendUrl}/worker/process_image_generation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskId: taskId,
      }),
    });

    if (!response.ok) {
      console.error('Backend worker request failed:', response.status, response.statusText);
      return {
        success: false,
        error: 'Backend worker request failed',
      };
    } else {
      const result = await response.json();
      console.log('Backend worker response:', result);
      return {
        success: true,
        data: result,
      };
    }
  } catch (fetchError) {
    console.error('Failed to call backend worker:', fetchError);
    return {
      success: false,
      error: fetchError instanceof Error ? fetchError.message : 'Unknown error',
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

    // 重新触发图片生成任务
    const triggerResult = await triggerImageGeneration(result.id);

    if (!triggerResult.success) {
      return {
        success: false,
        error: triggerResult.error || 'Failed to trigger image generation',
      };
    }

    return {
      success: true,
      data: result,
      message: 'Task updated successfully',
    };
  } catch (error) {
    console.error('updateImageGeneration error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
