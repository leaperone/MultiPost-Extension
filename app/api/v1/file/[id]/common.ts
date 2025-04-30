import { prisma } from '@/lib/db';
import { headObject } from '@/lib/bitiful';

export async function initFile(fileId: string) {
  try {
    let file = await prisma.fileHosting.findUnique({
      where: {
        id: fileId,
      },
    });

    if (!file) {
      throw new Error('file not found');
    }

    if (file.expiredAt && file.expiredAt < new Date()) {
      throw new Error('file expired');
    }

    if (!file.type || !file.size) {
      const head = await headObject(file.key);
      if (head.ContentType && head.ContentLength) {
        file = await prisma.fileHosting.update({
          where: { id: fileId },
          data: {
            type: head.ContentType,
            size: head.ContentLength,
          },
        });
      } else {
        throw new Error('file not found');
      }
    }

    return {
      success: true,
      file,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
