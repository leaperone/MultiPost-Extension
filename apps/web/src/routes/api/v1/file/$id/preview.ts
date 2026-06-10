import { createFileRoute } from '@tanstack/react-router';

import { cdnUrl, getEndPoint } from '@/lib/bitiful';
import { FileHosting } from '@db/schema/schema';
import { eq, sql } from 'drizzle-orm';

import { preflightResponse, withCors } from '../../../../../lib/cors';
import { db } from '../../../../../lib/db';
import { errorResp, successResp } from '../../../../../lib/request';
import { fileMetadata, initFile, optionalFileAuth } from '../-common';

export const Route = createFileRoute('/api/v1/file/$id/preview')({
  server: {
    handlers: {
      OPTIONS: async () => preflightResponse(),
      GET,
    },
  },
});

async function GET({ request, params }: { request: Request; params: { id: string } }) {
  try {
    await optionalFileAuth(request);

    const fileId = params.id;
    if (!fileId) {
      throw new Error('fileId is required');
    }

    const { success, file, error } = await initFile(fileId);
    if (!success || !file) {
      throw new Error(error);
    }

    const endpoint = getEndPoint();
    let url = `${endpoint}/${file.key}`;

    if (file.type?.startsWith('image/')) {
      url += '!style=imagePreview';
    } else {
      throw new Error('Unsupported Preview');
    }

    url = cdnUrl(url);

    await db
      .update(FileHosting)
      .set({
        times: sql`${FileHosting.times} + 1`,
        previewUrl: url,
        updatedAt: new Date(),
      })
      .where(eq(FileHosting.id, fileId));

    return withCors(
      successResp({
        ...fileMetadata(fileId, file),
        previewUrl: url,
      }),
    );
  } catch (error) {
    return withCors(errorResp(error));
  }
}
