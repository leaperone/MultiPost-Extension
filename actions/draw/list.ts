'use server';

import { multipostDb } from '@/lib/db';
import { ImageGenerationStatus } from '@/app/api/draw/image/types';
import { auth } from '@/auth';

export async function listAllImages() {
  try {
    const session = await auth();
    if (!session?.user || !session.user.id) {
      throw new Error('Unauthorized');
    }

    const result = await multipostDb.imageGeneration.findMany({
      where: {
        userId: session.user.id,
        status: ImageGenerationStatus.DONE,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        prompt: true,
        createdAt: true,
        result: true,
      },
    });
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function listAllPosters() {
  try {
    const session = await auth();
    if (!session?.user || !session.user.id) {
      throw new Error('Unauthorized');
    }
    const result = await multipostDb.posterGeneration.findMany({
      where: {
        userId: session.user.id,
        status: 'done',
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        prompt: true,
        taskId: true,
        projectId: true,
        createdAt: true,
        lastImageUrl: true,
      },
    });
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
