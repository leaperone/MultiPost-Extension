'use server';

import { multipostDb } from '@/lib/db';
import { PosterGenerationSchema, PosterGenerationStatus, Category } from './types';
import { auth } from '@/auth';
import { preCheckCredit } from '@/actions/credit';
import { PRICING } from '@/actions/credit/types';
import { Prisma } from '@/prisma/client_multipost';

export async function getAvailableModels() {
  const response = await fetch('https://api.seede.ai/api/task/models', {
    headers: {
      authorization: process.env.SEEDE_API_TOKEN!,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch available models');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error);
  }
  return {
    success: data.success,
    data: data.models as string[],
  };
}

export async function generatePoster(data: PosterGenerationSchema) {
  try {
    const session = await auth();
    if (!session?.user || !session.user.id) {
      throw new Error('Unauthorized');
    }

    if (!(await preCheckCredit(session.user.id, PRICING.POSTER_GENERATION.toNumber()))) {
      throw new Error('Insufficient credits');
    }

    const result = await multipostDb.$transaction(async (tx) => {
      const created = await tx.posterGeneration.create({
        data: {
          userId: session.user.id as string,
          prompt: data.prompt,
          status: PosterGenerationStatus.PENDING,
          width: data.width,
          height: data.height,
          model: data.model,
          systemPrompt: Category.find((item) => item.name === data.category)?.systemPrompt,
        },
      });

      const response = await fetch('https://api.seede.ai/api/task/create', {
        method: 'POST',
        headers: {
          authorization: process.env.SEEDE_API_TOKEN!,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          name: created.id,
          prompt: data.prompt,
          size: {
            w: data.width,
            h: data.height,
          },
          model: data.model,
          format: 'webp',
          webhookURL: process.env.SEEDE_WEBHOOK_URL!,
          systemPrompt: Category.find((item) => item.name === data.category)?.systemPrompt,
        }),
      });

      const responseData = await response.json();

      if (response.ok) {
        if (!responseData.success) {
          throw new Error(responseData.error);
        }
        await tx.posterGeneration.update({
          where: { id: created.id },
          data: {
            taskId: responseData.task.id,
            status: responseData.task.status,
            urls: responseData.urls,
          },
        });
      } else {
        throw new Error(responseData.error);
      }
      return created;
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

export async function getPosterGeneration(id: string) {
  try {
    const session = await auth();
    if (!session?.user || !session.user.id) {
      throw new Error('Unauthorized');
    }
    const result = await multipostDb.posterGeneration.findUnique({
      where: { id, userId: session.user.id },
    });

    if (!result) {
      throw new Error('Poster generation not found');
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

export async function getPosterGenerations(status: string) {
  try {
    const session = await auth();
    if (!session?.user || !session.user.id) {
      throw new Error('Unauthorized');
    }

    const where: Prisma.PosterGenerationWhereInput = {
      userId: session.user.id,
    };

    if (status !== 'all') {
      where.status = status;
    }

    const result = await multipostDb.posterGeneration.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
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

export async function getIframeUrl(id: string) {
  try {
    const session = await auth();
    if (!session?.user || !session.user.id) {
      throw new Error('Unauthorized');
    }
    const result = await multipostDb.posterGeneration.findUnique({
      where: { id, userId: session.user.id },
    });

    if (!result) {
      throw new Error('Poster generation not found');
    }

    const response = await fetch(`https://api.seede.ai/api/token/generate`, {
      method: 'POST',
      headers: {
        authorization: process.env.SEEDE_API_TOKEN!,
        'content-type': 'application/json',
      },
    });

    const responseData = await response.json();

    if (!responseData.success) {
      throw new Error(responseData.error);
    }

    return {
      success: true,
      data: {
        error: responseData.error,
        status: result.status,
        url: `https://seede.ai/design-embed/${result.projectId}?token=${responseData.token}`,
      },
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
