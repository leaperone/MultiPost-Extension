import { headObject } from '@/lib/bitiful';

import { authKey } from '../../../../lib/authKey';
import { multipostDb } from '../../../../lib/db';

export async function optionalFileAuth(request: Request) {
  try {
    await authKey(request);
  } catch (error) {
    console.warn('Optional file route authKey failed:', error);
  }
}

export async function initFile(fileId: string) {
  try {
    let file = await multipostDb.fileHosting.findFirst({
      where: {
        id: fileId,
        deletedAt: null,
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
        file = await multipostDb.fileHosting.update({
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

type InitializedFile = NonNullable<Awaited<ReturnType<typeof initFile>>['file']>;

export function fileMetadata(fileId: string, file: InitializedFile) {
  return {
    fileId,
    type: file.type,
    size: file.size,
    filename: file.filename,
    expiredAt: file.expiredAt,
  };
}
