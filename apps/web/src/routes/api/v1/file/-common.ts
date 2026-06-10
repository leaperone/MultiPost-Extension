import { headObject } from '@/lib/bitiful';
import { FileHosting } from '@db/schema/schema';
import { and, eq, isNull } from 'drizzle-orm';

import { authKey } from '../../../../lib/authKey';
import { db } from '../../../../lib/db';

export async function optionalFileAuth(request: Request) {
  try {
    await authKey(request);
  } catch (error) {
    console.warn('Optional file route authKey failed:', error);
  }
}

export async function initFile(fileId: string) {
  try {
    let file = (
      await db
        .select()
        .from(FileHosting)
        .where(and(eq(FileHosting.id, fileId), isNull(FileHosting.deletedAt)))
        .limit(1)
    )[0];

    if (!file) {
      throw new Error('file not found');
    }

    if (file.expiredAt && file.expiredAt < new Date()) {
      throw new Error('file expired');
    }

    if (!file.type || !file.size) {
      const head = await headObject(file.key);
      if (head.ContentType && head.ContentLength) {
        file = (
          await db
            .update(FileHosting)
            .set({
            type: head.ContentType,
            size: head.ContentLength,
              updatedAt: new Date(),
            })
            .where(eq(FileHosting.id, fileId))
            .returning()
        )[0];
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
