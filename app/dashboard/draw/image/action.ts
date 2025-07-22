/* eslint-disable @typescript-eslint/no-explicit-any */
'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { ImageGenerationStatus } from '@/app/api/draw/image/types';

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

    revalidatePath('/dashboard/draw/image');
    return { success: true, data: processedGenerations };
  } catch (error) {
    console.error('Failed to get image generations:', error);
    return { success: false, error: error instanceof Error ? error.message : '获取图片生成历史失败' };
  }
}
