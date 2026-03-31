'use server';

import { multipostDb } from '@/lib/db';
import {
  PosterGenerationStatus,
  Category,
  SeedeTheme,
  type PosterGenerationSchema as PosterGenerationSchemaType,
  type SeedeMaterialData,
  type SeedeDocumentData,
} from './types';
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

export async function generatePoster(data: PosterGenerationSchemaType) {
  try {
    const session = await auth();
    if (!session?.user || !session.user.id) {
      throw new Error('Unauthorized');
    }

    // if (!(await preCheckCredit(session.user.id, PRICING.POSTER_GENERATION.toNumber()))) {
    //   throw new Error('Insufficient credits');
    // }

    // Build prompt with theme suffix if not default
    const selectedTheme = SeedeTheme.find((t) => t.value === data.theme);
    const themePromptSuffix =
      selectedTheme && selectedTheme.value !== 'default' ? ` @SeedeTheme(${JSON.stringify(selectedTheme)})` : '';
    const finalPrompt = `${data.prompt}${themePromptSuffix}`;

    const category = Category.find((item) => item.name === data.category);
    const isScrollytelling = category?.scene === 'scrollytelling';

    const result = await multipostDb.$transaction(async (tx) => {
      const created = await tx.posterGeneration.create({
        data: {
          userId: session.user.id as string,
          prompt: finalPrompt,
          status: PosterGenerationStatus.PENDING,
          width: data.width as number,
          height: data.height as number,
          model: data.model as string,
          systemPrompt: category?.systemPrompt,
        },
      });

      const bodyData: Record<string, unknown> = {
        name: created.id,
        prompt: finalPrompt,
        size: {
          w: data.width,
          h: data.height,
        },
        model: data.model,
        format: data.format || 'webp',
        webhookURL: `${process.env.SEEDE_WEBHOOK_URL}?secret=${process.env.SEEDE_WEBHOOK_SECRET}`,
        systemPrompt: category?.systemPrompt,
        scene: category?.scene,
      };
      if (isScrollytelling) {
        bodyData.height = 'auto';
      }

      const response = await fetch('https://api.seede.ai/api/task/create', {
        method: 'POST',
        headers: {
          authorization: process.env.SEEDE_API_TOKEN!,
          'content-type': 'application/json',
        },
        body: JSON.stringify(bodyData),
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
      body: JSON.stringify({
        project_id: result.projectId,
        expires_in: 60 * 24 * 60 * 60, // 60 days in seconds
      }),
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
        url: `https://seede.ai/design-embed/${result.projectId}?token=${responseData.token}&whiteLabel=true`,
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

    // 如果是完成状态，使用条件更新防止重复扣费
    if (responseData.task.status === 'completed') {
      const updated = await multipostDb.posterGeneration.updateMany({
        where: { id: result.id, status: { not: PosterGenerationStatus.COMPLETED } },
        data: {
          status: PosterGenerationStatus.COMPLETED,
          urls: responseData.task.metadata.urls,
          lastImageUrl: responseData.task.metadata.urls.image,
          projectId: responseData.task.project_id,
          taskId: responseData.task.task_id,
        },
      });

      // 只有成功更新了才扣积分（避免重复扣费）
      if (updated.count > 0) {
        try {
          await deductCredit({
            userId: result.userId,
            type: 'IMAGE_GENERATION',
            amount: PRICING.POSTER_GENERATION,
          });
        } catch (error) {
          console.error('扣除积分失败:', error);
        }
      }

      // 重新查询返回最新数据
      const latest = await multipostDb.posterGeneration.findUnique({
        where: { id: result.id },
      });

      return {
        success: true,
        data: latest,
      };
    }

    const updateData: {
      status: string;
      urls: {
        task: string;
        image: string;
        project: string;
      };
      error?: string;
      projectId: string;
      taskId: string;
    } = {
      status: responseData.task.status,
      urls: responseData.task.metadata.urls,
      projectId: responseData.task.project_id,
      taskId: responseData.task.task_id,
    };

    // 如果是失败状态，记录错误信息
    if (responseData.task.status === 'failed') {
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

export async function uploadAsset(
  dataURL: string,
  filename: string,
  contentType: string,
  width: number,
  height: number,
  size?: number,
): Promise<{ success: boolean; data?: SeedeMaterialData; error?: string }> {
  try {
    // 5MB in base64 ≈ 6.67MB string length
    if (dataURL.length > 7 * 1024 * 1024) {
      return { success: false, error: 'File too large (max 5MB)' };
    }

    const session = await auth();
    if (!session?.user || !session.user.id) {
      throw new Error('Unauthorized');
    }

    const response = await fetch('https://api.seede.ai/asset', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${process.env.SEEDE_API_TOKEN!}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: filename,
        parent_id: '',
        size: size || 0,
        source: 'material',
        type: 'user',
        contentType,
        dataURL,
        meta: {
          filename,
          source: 'material',
          w: width,
          h: height,
        },
      }),
    });

    const responseData = await response.json();
    if (!response.ok || !responseData.asset) {
      throw new Error(responseData.error || 'Failed to upload asset');
    }

    const asset = responseData.asset;
    return {
      success: true,
      data: {
        filename,
        url: asset.url || `https://static.seedeai.com/asset/${asset.id}`,
        width,
        height,
        aspectRatio: Math.round((width / height) * 100) / 100,
        tag: '',
      },
    };
  } catch (error) {
    console.error('Upload asset error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function uploadDocument(
  dataURL: string,
  filename: string,
  contentType: string,
  size?: number,
): Promise<{ success: boolean; data?: SeedeDocumentData; error?: string }> {
  try {
    // 5MB in base64 ≈ 6.67MB string length
    if (dataURL.length > 7 * 1024 * 1024) {
      return { success: false, error: 'File too large (max 5MB)' };
    }

    const session = await auth();
    if (!session?.user || !session.user.id) {
      throw new Error('Unauthorized');
    }

    const response = await fetch('https://api.seede.ai/asset', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${process.env.SEEDE_API_TOKEN!}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: filename,
        parent_id: '',
        size: size || 0,
        source: 'document',
        type: 'user',
        contentType,
        dataURL,
        meta: {
          filename,
          source: 'document',
        },
      }),
    });

    const responseData = await response.json();
    if (!response.ok || !responseData.asset) {
      throw new Error(responseData.error || 'Failed to upload document');
    }

    return {
      success: true,
      data: {
        filename,
        id: responseData.asset.id,
      },
    };
  } catch (error) {
    console.error('Upload document error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function parseDocument(assetId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user || !session.user.id) {
      throw new Error('Unauthorized');
    }

    const response = await fetch(`https://api.seede.ai/asset/${assetId}/parse`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${process.env.SEEDE_API_TOKEN!}`,
        'content-type': 'application/json',
      },
    });

    if (!response.ok) {
      const responseData = await response.json();
      throw new Error(responseData.error || 'Failed to parse document');
    }

    return { success: true };
  } catch (error) {
    console.error('Parse document error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getTaskHtml(id: string): Promise<{ success: boolean; data?: string; error?: string }> {
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

    const response = await fetch(`https://api.seede.ai/api/task/${result.taskId}/html`, {
      headers: {
        authorization: process.env.SEEDE_API_TOKEN!,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch task HTML');
    }

    const html = await response.text();
    return { success: true, data: html };
  } catch (error) {
    console.error('Get task HTML error:', error);
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
