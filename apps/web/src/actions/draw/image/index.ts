import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { multipostDb } from '../../../lib/db';
import {
  createImageGeneration as createLeaperOneTask,
  convertImageSize,
  getGenerationStatus,
} from '@/lib/leaperone';
import { getSession } from '../../../lib/session';
import { ImageGenerationSchema, ImageGenerationStatus, getPrompt } from './types';

const taskIdSchema = z.object({
  taskId: z.string().min(1),
});

const leaperOneIdSchema = z.object({
  leaperOneId: z.string().min(1),
});

const completeImageGenerationSchema = z.object({
  taskId: z.string().min(1),
  images: z.array(
    z.object({
      id: z.string().optional(),
      url: z.string().optional(),
    }),
  ),
});

const failImageGenerationSchema = z.object({
  taskId: z.string().min(1),
  errorMessage: z.string(),
});

export const newImageGeneration = createServerFn({ method: 'POST' })
  .validator(ImageGenerationSchema)
  .handler(async ({ data }) => {
    try {
      const session = await getSession();
      if (!session?.user?.id) {
        return {
          success: false,
          error: 'Unauthorized',
        };
      }

      const validatedTask = data;

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

      const leaperOneSize = convertImageSize(validatedTask.size);

      const leaperOneId = await createLeaperOneTask({
        prompt: extraPrompt,
        size: leaperOneSize,
        number: validatedTask.number,
        referenceImages: validatedTask.images,
      });

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
  });

export const listAllImages = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
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
});

export const getImageGeneration = createServerFn({ method: 'GET' })
  .validator(taskIdSchema)
  .handler(async ({ data }) => {
    try {
      const session = await getSession();
      if (!session?.user?.id) {
        return {
          success: false,
          error: 'Unauthorized',
        };
      }

      const task = await multipostDb.imageGeneration.findFirst({
        where: {
          id: data.taskId,
          userId: session.user.id,
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
  });

export const updateImageGeneration = createServerFn({ method: 'GET' })
  .validator(taskIdSchema)
  .handler(async ({ data }) => {
    try {
      const session = await getSession();
      if (!session?.user?.id) {
        return {
          success: false,
          error: 'Unauthorized',
        };
      }

      const result = await multipostDb.imageGeneration.findFirst({
        where: {
          id: data.taskId,
          userId: session.user.id,
        },
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
  });

export const checkLeaperOneStatus = createServerFn({ method: 'GET' })
  .validator(leaperOneIdSchema)
  .handler(async ({ data }) => {
    try {
      const session = await getSession();
      if (!session?.user?.id) {
        return { success: false, error: 'Unauthorized' };
      }

      const task = await multipostDb.imageGeneration.findFirst({
        where: {
          workflowId: data.leaperOneId,
          userId: session.user.id,
        },
      });

      if (!task) {
        return { success: false, error: 'Task not found' };
      }

      const status = await getGenerationStatus(data.leaperOneId);

      return {
        success: true,
        data: {
          taskId: task.id,
          leaperOneId: data.leaperOneId,
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
  });

export const completeImageGeneration = createServerFn({ method: 'POST' })
  .validator(completeImageGenerationSchema)
  .handler(async ({ data }) => {
    try {
      const session = await getSession();
      if (!session?.user?.id) {
        return { success: false, error: 'Unauthorized' };
      }

      const task = await multipostDb.imageGeneration.findFirst({
        where: {
          id: data.taskId,
          userId: session.user.id,
        },
      });

      if (!task) {
        return { success: false, error: 'Task not found' };
      }

      for (const image of data.images) {
        if (!image.url) continue;

        const previewUrl = `${image.url}!style=imagePreview`;

        await multipostDb.imageGenerationLog.create({
          data: {
            userId: session.user.id,
            imageGenerationId: data.taskId,
            url: image.url,
            previewUrl,
            response: { source: 'leaperone', imageId: image.id },
          },
        });
      }

      await multipostDb.imageGeneration.update({
        where: { id: data.taskId },
        data: { status: ImageGenerationStatus.COMPLETED },
      });

      return {
        success: true,
        data: { taskId: data.taskId },
      };
    } catch (error) {
      console.error('completeImageGeneration error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

export const failImageGeneration = createServerFn({ method: 'POST' })
  .validator(failImageGenerationSchema)
  .handler(async ({ data }) => {
    try {
      const session = await getSession();
      if (!session?.user?.id) {
        return { success: false, error: 'Unauthorized' };
      }

      const task = await multipostDb.imageGeneration.findFirst({
        where: {
          id: data.taskId,
          userId: session.user.id,
        },
      });

      if (!task) {
        return { success: false, error: 'Task not found' };
      }

      await multipostDb.imageGeneration.update({
        where: { id: data.taskId },
        data: {
          status: ImageGenerationStatus.FAILED,
          message: data.errorMessage,
        },
      });

      return {
        success: true,
        data: { taskId: data.taskId },
      };
    } catch (error) {
      console.error('failImageGeneration error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
