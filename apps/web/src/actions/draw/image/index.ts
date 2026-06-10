import { createServerFn } from '@tanstack/react-start';
import { FileHosting, ImageGeneration, ImageGenerationLog } from '@db/schema/schema';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../../../lib/db';
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

type ImageLogWithFile = typeof ImageGenerationLog.$inferSelect & {
  fileHosting: typeof FileHosting.$inferSelect | null;
};

async function imageLogsByTaskIds(taskIds: string[]) {
  if (taskIds.length === 0) {
    return new Map<string, ImageLogWithFile[]>();
  }

  const rows = await db
    .select({
      log: ImageGenerationLog,
      fileHosting: FileHosting,
    })
    .from(ImageGenerationLog)
    .leftJoin(FileHosting, eq(ImageGenerationLog.fileHostingId, FileHosting.id))
    .where(inArray(ImageGenerationLog.imageGenerationId, taskIds));

  const grouped = new Map<string, ImageLogWithFile[]>();
  for (const row of rows) {
    const item = { ...row.log, fileHosting: row.fileHosting };
    const logs = grouped.get(row.log.imageGenerationId) ?? [];
    logs.push(item);
    grouped.set(row.log.imageGenerationId, logs);
  }
  return grouped;
}

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

      const [newTask] = await db
        .insert(ImageGeneration)
        .values({
          userId: session.user.id,
          prompt: validatedTask.prompt,
          extraPrompt,
          images: validatedTask.images || [],
          number: validatedTask.number,
          size: validatedTask.size.toString(),
          status: ImageGenerationStatus.PROCESSING,
          workflowId: leaperOneId,
        })
        .returning();

      if (!newTask) {
        throw new Error('Failed to create image generation task');
      }

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

    const tasks = await db
      .select()
      .from(ImageGeneration)
      .where(
        and(
          eq(ImageGeneration.userId, session.user.id),
          eq(ImageGeneration.status, ImageGenerationStatus.COMPLETED),
        ),
      )
      .orderBy(desc(ImageGeneration.createdAt));
    const logs = await imageLogsByTaskIds(tasks.map((task) => task.id));
    const result = tasks.map((task) => ({
      ...task,
      ImageGenerationLog: logs.get(task.id) ?? [],
    }));
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

      const [task] = await db
        .select()
        .from(ImageGeneration)
        .where(and(eq(ImageGeneration.id, data.taskId), eq(ImageGeneration.userId, session.user.id)))
        .limit(1);

      if (!task) {
        return {
          success: false,
          error: 'Task not found',
        };
      }

      const logs = await imageLogsByTaskIds([task.id]);

      return {
        success: true,
        data: {
          ...task,
          ImageGenerationLog: logs.get(task.id) ?? [],
        },
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

      const [result] = await db
        .select()
        .from(ImageGeneration)
        .where(and(eq(ImageGeneration.id, data.taskId), eq(ImageGeneration.userId, session.user.id)))
        .limit(1);

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

      const [task] = await db
        .select()
        .from(ImageGeneration)
        .where(and(eq(ImageGeneration.workflowId, data.leaperOneId), eq(ImageGeneration.userId, session.user.id)))
        .limit(1);

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

      const [task] = await db
        .select()
        .from(ImageGeneration)
        .where(and(eq(ImageGeneration.id, data.taskId), eq(ImageGeneration.userId, session.user.id)))
        .limit(1);

      if (!task) {
        return { success: false, error: 'Task not found' };
      }

      for (const image of data.images) {
        if (!image.url) continue;

        const previewUrl = `${image.url}!style=imagePreview`;

        await db.insert(ImageGenerationLog).values({
            userId: session.user.id,
            imageGenerationId: data.taskId,
            url: image.url,
            previewUrl,
            response: { source: 'leaperone', imageId: image.id ?? null },
        });
      }

      await db
        .update(ImageGeneration)
        .set({ status: ImageGenerationStatus.COMPLETED, updatedAt: new Date() })
        .where(eq(ImageGeneration.id, data.taskId));

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

      const [task] = await db
        .select()
        .from(ImageGeneration)
        .where(and(eq(ImageGeneration.id, data.taskId), eq(ImageGeneration.userId, session.user.id)))
        .limit(1);

      if (!task) {
        return { success: false, error: 'Task not found' };
      }

      await db
        .update(ImageGeneration)
        .set({
          status: ImageGenerationStatus.FAILED,
          message: data.errorMessage,
          updatedAt: new Date(),
        })
        .where(eq(ImageGeneration.id, data.taskId));

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
