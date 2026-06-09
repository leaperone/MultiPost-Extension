import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { multipostDb } from '../../../lib/db';
import { PRICING } from '@/actions/credit/types';
import type { Prisma } from '@/prisma/client_multipost';
import { deductCredit } from '../../credit/_core';
import { getSession } from '../../../lib/session';
import {
  Category,
  PosterGenerationSchema,
  PosterGenerationStatus,
  SeedeTheme,
  type SeedeDocumentData,
  type SeedeMaterialData,
} from './types';

const idSchema = z.object({
  id: z.string().min(1),
});

const statusSchema = z.object({
  status: z.string(),
});

const uploadAssetSchema = z.object({
  dataURL: z.string(),
  filename: z.string().min(1),
  contentType: z.string().min(1),
  width: z.number().positive(),
  height: z.number().positive(),
  size: z.number().nonnegative().optional(),
});

const uploadDocumentSchema = z.object({
  dataURL: z.string(),
  filename: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().nonnegative().optional(),
});

const assetIdSchema = z.object({
  assetId: z.string().min(1),
});

export const getAvailableModels = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

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
});

export const generatePoster = createServerFn({ method: 'POST' })
  .validator(PosterGenerationSchema)
  .handler(async ({ data }) => {
    try {
      const session = await getSession();
      if (!session?.user?.id) {
        throw new Error('Unauthorized');
      }

      const selectedTheme = SeedeTheme.find((t) => t.value === data.theme);
      const themePromptSuffix =
        selectedTheme && selectedTheme.value !== 'default' ? ` @SeedeTheme(${JSON.stringify(selectedTheme)})` : '';
      const finalPrompt = `${data.prompt}${themePromptSuffix}`;

      const category = Category.find((item) => item.name === data.category);
      const isScrollytelling = category?.scene === 'scrollytelling';

      const result = await multipostDb.$transaction(async (tx) => {
        const created = await tx.posterGeneration.create({
          data: {
            userId: session.user.id,
            prompt: finalPrompt,
            status: PosterGenerationStatus.PENDING,
            width: data.width,
            height: data.height,
            model: data.model,
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
  });

export const getPosterGeneration = createServerFn({ method: 'GET' })
  .validator(idSchema)
  .handler(async ({ data }) => {
    try {
      const session = await getSession();
      if (!session?.user?.id) {
        throw new Error('Unauthorized');
      }
      const result = await multipostDb.posterGeneration.findUnique({
        where: { id: data.id, userId: session.user.id },
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
  });

export const getPosterGenerations = createServerFn({ method: 'GET' })
  .validator(statusSchema)
  .handler(async ({ data }) => {
    try {
      const session = await getSession();
      if (!session?.user?.id) {
        throw new Error('Unauthorized');
      }

      const where: Prisma.PosterGenerationWhereInput = {
        userId: session.user.id,
      };

      if (data.status !== 'all') {
        where.status = data.status;
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
  });

export const getIframeUrl = createServerFn({ method: 'POST' })
  .validator(idSchema)
  .handler(async ({ data }) => {
    try {
      const session = await getSession();
      if (!session?.user?.id) {
        throw new Error('Unauthorized');
      }
      const result = await multipostDb.posterGeneration.findUnique({
        where: { id: data.id, userId: session.user.id },
      });

      if (!result) {
        throw new Error('Poster generation not found');
      }

      const now = new Date();
      const TOKEN_REFRESH_BUFFER = 7 * 24 * 60 * 60 * 1000;

      if (
        result.seedeToken &&
        result.seedeTokenExpiresAt &&
        result.seedeTokenExpiresAt.getTime() - now.getTime() > TOKEN_REFRESH_BUFFER
      ) {
        return {
          success: true,
          data: {
            error: result.error,
            status: result.status,
            url: `https://seede.ai/design-embed/${result.projectId}?token=${result.seedeToken}&whiteLabel=true`,
          },
        };
      }

      const response = await fetch('https://api.seede.ai/api/token/generate', {
        method: 'POST',
        headers: {
          authorization: process.env.SEEDE_API_TOKEN!,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          project_id: result.projectId,
          expires_in: 60 * 24 * 60 * 60,
        }),
      });

      const responseData = await response.json();

      if (!responseData.success) {
        throw new Error(responseData.error);
      }

      const expiresAt = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
      await multipostDb.posterGeneration.update({
        where: { id: data.id },
        data: { seedeToken: responseData.token, seedeTokenExpiresAt: expiresAt },
      });

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
  });

export const updatePosterGeneration = createServerFn({ method: 'POST' })
  .validator(idSchema)
  .handler(async ({ data }) => {
    try {
      const session = await getSession();
      if (!session?.user?.id) {
        throw new Error('Unauthorized');
      }

      const result = await multipostDb.posterGeneration.findUnique({
        where: { id: data.id, userId: session.user.id },
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

      if (responseData.task.status === 'failed') {
        updateData.error = responseData.task.error || 'Poster generation failed: Internal Server Error';
        updateData.status = PosterGenerationStatus.FAILED;
      }

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
  });

export const uploadAsset = createServerFn({ method: 'POST' })
  .validator(uploadAssetSchema)
  .handler(async ({ data }): Promise<{ success: boolean; data?: SeedeMaterialData; error?: string }> => {
    try {
      if (data.dataURL.length > 7 * 1024 * 1024) {
        return { success: false, error: 'File too large (max 5MB)' };
      }

      const session = await getSession();
      if (!session?.user?.id) {
        throw new Error('Unauthorized');
      }

      const response = await fetch('https://api.seede.ai/asset', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${process.env.SEEDE_API_TOKEN!}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          name: data.filename,
          parent_id: '',
          size: data.size || 0,
          source: 'material',
          type: 'user',
          contentType: data.contentType,
          dataURL: data.dataURL,
          meta: {
            filename: data.filename,
            source: 'material',
            w: data.width,
            h: data.height,
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
          filename: data.filename,
          url: asset.url || `https://static.seedeai.com/asset/${asset.id}`,
          width: data.width,
          height: data.height,
          aspectRatio: Math.round((data.width / data.height) * 100) / 100,
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
  });

export const uploadDocument = createServerFn({ method: 'POST' })
  .validator(uploadDocumentSchema)
  .handler(async ({ data }): Promise<{ success: boolean; data?: SeedeDocumentData; error?: string }> => {
    try {
      if (data.dataURL.length > 7 * 1024 * 1024) {
        return { success: false, error: 'File too large (max 5MB)' };
      }

      const session = await getSession();
      if (!session?.user?.id) {
        throw new Error('Unauthorized');
      }

      const response = await fetch('https://api.seede.ai/asset', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${process.env.SEEDE_API_TOKEN!}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          name: data.filename,
          parent_id: '',
          size: data.size || 0,
          source: 'document',
          type: 'user',
          contentType: data.contentType,
          dataURL: data.dataURL,
          meta: {
            filename: data.filename,
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
          filename: data.filename,
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
  });

export const parseDocument = createServerFn({ method: 'POST' })
  .validator(assetIdSchema)
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    try {
      const session = await getSession();
      if (!session?.user?.id) {
        throw new Error('Unauthorized');
      }

      const response = await fetch(`https://api.seede.ai/asset/${data.assetId}/parse`, {
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
  });

export const getTaskHtml = createServerFn({ method: 'GET' })
  .validator(idSchema)
  .handler(async ({ data }): Promise<{ success: boolean; data?: string; error?: string }> => {
    try {
      const session = await getSession();
      if (!session?.user?.id) {
        throw new Error('Unauthorized');
      }

      const result = await multipostDb.posterGeneration.findUnique({
        where: { id: data.id, userId: session.user.id },
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
  });

export const listAllPosters = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
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
});
