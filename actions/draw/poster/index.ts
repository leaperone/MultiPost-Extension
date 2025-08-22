'use server';

import { multipostDb } from '@/lib/db';
import { PosterGenerationSchema, PosterGenerationStatus, Category } from './types';
import { auth } from '@/auth';
import { deductCredit } from '@/actions/credit';
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

    // if (!(await preCheckCredit(session.user.id, PRICING.POSTER_GENERATION.toNumber()))) {
    //   throw new Error('Insufficient credits');
    // }

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
      where: { id },
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

export async function updatePosterGeneration(id: string) {
  try {
    const result = await multipostDb.posterGeneration.findUnique({
      where: { id },
    });

    if (!result) {
      throw new Error('Poster generation not found');
    }

    if (result.status === PosterGenerationStatus.COMPLETED) {
      return {
        success: true,
        data: result,
      };
    }

    if (result.status === PosterGenerationStatus.FAILED) {
      return {
        success: true,
        data: result,
      };
    }

    const response = await fetch(`https://api.seede.ai/api/task/${result.taskId}`, {
      headers: {
        authorization: process.env.SEEDE_API_TOKEN!,
        'content-type': 'application/json',
      },
    });

    const responseData = await response.json();

    if (!responseData.success) {
      throw new Error(responseData.error);
    }

    const updateData: {
      status: string;
      urls: {
        task: string;
        image: string;
        project: string;
      };
      lastImageUrl?: string;
      error?: string;
      projectId: string;
      taskId: string;
    } = {
      status: responseData.task.status,
      urls: responseData.task.metadata.urls,
      projectId: responseData.task.project_id,
      taskId: responseData.task.task_id,
    };

    // 如果是完成状态，添加最后的图片URL
    if (responseData.task.status === 'completed') {
      updateData.lastImageUrl = responseData.task.metadata.urls.image;
      updateData.status = PosterGenerationStatus.COMPLETED;

      // 扣除用户积分
      try {
        await deductCredit({
          userId: result.userId,
          type: 'IMAGE_GENERATION', // 使用现有的图像生成类型
          amount: PRICING.POSTER_GENERATION,
        });
      } catch (error) {
        console.error('扣除积分失败:', error);
        // 继续处理，不中断流程
      }
    }

    // 如果是失败状态，记录错误信息
    else if (responseData.task.status === 'failed') {
      updateData.error = responseData.task.error || 'Poster generation failed: Internal Server Error';
      updateData.status = PosterGenerationStatus.FAILED;
    }

    // 更新数据库
    const updated = await multipostDb.posterGeneration.update({
      where: { id: result.id },
      data: updateData,
    });

    return {
      success: true,
      data: updated,
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
        status: PosterGenerationStatus.COMPLETED,
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
