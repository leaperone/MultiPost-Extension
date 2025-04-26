'use server';

import { multipostDb } from '@/lib/db';
import { ImageGenerationSchema, ImageGenerationStatus, getPrompt } from './types';
import { auth } from '@/auth';
import { preCheckCredit } from '@/actions/credit';
import { PRICING } from '@/actions/credit/types';
import { Prisma } from '@/prisma/client_multipost';

export async function generateImage(data: ImageGenerationSchema) {
  try {
    const session = await auth();
    if (!session?.user || !session.user.id) {
      throw new Error('Unauthorized');
    }

    if (!(await preCheckCredit(session.user.id, PRICING.IMAGE_GENERATION.mul(data.number).toNumber()))) {
      throw new Error('Insufficient credits');
    }

    let extraPrompt = '';

    if (data.composition) {
      extraPrompt = `${getPrompt('composition', data.composition)} ${extraPrompt}`;
    }

    if (data.color) {
      extraPrompt = `${getPrompt('color', data.color)} ${extraPrompt}`;
    }

    if (data.style) {
      extraPrompt = `${getPrompt('style', data.style)} ${extraPrompt}`;
    }

    const result = await multipostDb.imageGeneration.create({
      data: {
        userId: session.user.id,
        prompt: data.prompt,
        extraPrompt,
        images: data.images,
        number: data.number,
        size: data.size.toString(),
        status: ImageGenerationStatus.PENDING,
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    await fetch(`${process.env.WORKER_BASE_URL}/api/image-generation-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: result.id,
      }),
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

export async function getImageGeneration(id: string) {
  try {
    const session = await auth();
    if (!session?.user || !session.user.id) {
      throw new Error('Unauthorized');
    }
    const result = await multipostDb.imageGeneration.findUnique({
      where: { id, userId: session.user.id },
      select: {
        id: true,
        prompt: true,
        images: true,
        number: true,
        size: true,
        status: true,
        response: true,
        result: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!result) {
      throw new Error('Image generation not found');
    }
    if (result.response && (result.response as { content: string }).content) {
      (result.response as { content: string }).content = (result.response as { content: string }).content
        .replace(/```[\s\S]*?```/g, '')
        .trim();
    }

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

export async function getImageGenerations(status: string) {
  try {
    const session = await auth();
    if (!session?.user || !session.user.id) {
      throw new Error('Unauthorized');
    }

    const where: Prisma.ImageGenerationWhereInput = {
      userId: session.user.id,
    };

    if (status !== 'all') {
      where.status = status;
    }

    const result = await multipostDb.imageGeneration.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        prompt: true,
        images: true,
        number: true,
        size: true,
        status: true,
        response: true,
        result: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (result.length > 0) {
      for (const item of result) {
        if (item.response && (item.response as { content: string }).content) {
          (item.response as { content: string }).content = (item.response as { content: string }).content
            .replace(/```[\s\S]*?```/g, '')
            .trim();
        }
      }
    }

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
