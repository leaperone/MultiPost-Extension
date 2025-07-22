/* eslint-disable @typescript-eslint/no-explicit-any */
'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { ImageGenerationStatus, ImageGenerationSchema, getPrompt } from '@/app/api/draw/image/types';
import { z } from 'zod';
import { preCheckCredit } from '@/actions/credit';
import { PRICING } from '@/actions/credit/types';

function extractImageUrl(data: any): string | null {
  if (
    Array.isArray(data) &&
    data.length > 0 &&
    typeof data[0] === 'object' &&
    data[0] !== null &&
    typeof data[0].url === 'string'
  ) {
    return data[0].url;
  }

  return null;
}

/**
 * Get image generation record by id
 * @description Retrieves a single image generation record for the current user by id
 * @param {string} id - The id of the image generation record
 * @returns {Promise<{ success: boolean; data?: any; error?: string }>} Result object
 */
export async function getImageGeneration(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const generation = await prisma.imageGeneration.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        fileHosting: {
          select: {
            previewUrl: true,
          },
        },
      },
    });

    if (!generation) {
      return { success: false, error: 'Not found' };
    }

    const imageUrlFromResult = extractImageUrl(generation.result);
    const imageUrl = generation.fileHosting?.previewUrl || imageUrlFromResult;

    const processedGeneration = {
      id: generation.id,
      prompt: generation.prompt,
      status: generation.status,
      error: generation.status === 'failed' ? ((generation.response as any)?.error as string) || '生成失败' : null,
      imageUrl: imageUrl,
      createdAt: generation.createdAt.toISOString(),
    };

    return { success: true, data: processedGeneration };
  } catch (error) {
    console.error('Failed to get image generation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '获取图片生成记录失败',
    };
  }
}

export async function createImageGeneration(data: z.infer<typeof ImageGenerationSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' };
  }
  const userId = session.user.id;

  const parseResult = ImageGenerationSchema.safeParse(data);
  if (!parseResult.success) {
    return { success: false, error: `Invalid parameters: ${parseResult.error.message}` };
  }
  const task = parseResult.data;

  const hasEnoughCredits = await preCheckCredit(userId, PRICING.IMAGE_GENERATION.mul(task.number).toNumber());
  if (!hasEnoughCredits) {
    return { success: false, error: 'Insufficient credits' };
  }

  const prompts: string[] = [];
  if (task.style) {
    const p = getPrompt('style', task.style);
    if (p) prompts.push(p);
  }
  if (task.color) {
    const p = getPrompt('color', task.color);
    if (p) prompts.push(p);
  }
  if (task.composition) {
    const p = getPrompt('composition', task.composition);
    if (p) prompts.push(p);
  }
  if (task.size) {
    prompts.push(`size: ${task.size}`);
  }
  const extraPrompt = prompts.join('\n');

  try {
    const newTask = await prisma.imageGeneration.create({
      data: {
        userId,
        prompt: task.prompt,
        extraPrompt,
        images: task.images,
        number: task.number,
        size: task.size.toString(),
        status: ImageGenerationStatus.PENDING,
      },
    });
    return { success: true, data: { id: newTask.id } };
  } catch (error) {
    console.error('Failed to create image generation task:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create task in database',
    };
  }
}

export async function getImageGenerations(status: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const whereCondition: { userId: string; status?: string } = {
      userId: session.user.id,
    };

    if (status !== 'all' && Object.values(ImageGenerationStatus).includes(status as any)) {
      whereCondition.status = status as string;
    }

    const generations = await prisma.imageGeneration.findMany({
      where: whereCondition,
      include: {
        fileHosting: {
          select: {
            previewUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    const processedGenerations = generations.map(
      (gen: {
        id: string;
        prompt: string;
        status: string;
        response: any;
        result: any;
        images: any;
        createdAt: Date;
        fileHosting: { previewUrl: string | null } | null;
      }) => {
        const imageUrlFromResult = extractImageUrl(gen.result);

        const imageUrl = gen.fileHosting?.previewUrl || imageUrlFromResult;

        return {
          id: gen.id,
          prompt: gen.prompt,
          status: gen.status,
          error: gen.status === 'failed' ? ((gen.response as any)?.error as string) || '生成失败' : null,
          imageUrl: imageUrl,
          createdAt: gen.createdAt.toISOString(),
        };
      },
    );

    return { success: true, data: processedGenerations };
  } catch (error) {
    console.error('Failed to get image generations:', error);
    return { success: false, error: error instanceof Error ? error.message : '获取图片生成历史失败' };
  }
}
