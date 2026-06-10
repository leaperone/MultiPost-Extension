import { createFileRoute } from '@tanstack/react-router';

import { getPresignedDownloadUrl } from '@/lib/bitiful';
import { FileHosting } from '@db/schema/schema';
import { eq, sql } from 'drizzle-orm';

import { preflightResponse, withCors } from '../../../../lib/cors';
import { db } from '../../../../lib/db';
import { errorResp } from '../../../../lib/request';
import { initFile, optionalFileAuth } from './-common';

export const Route = createFileRoute('/api/v1/file/$id')({
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

    const url = await getPresignedDownloadUrl(file.key, 3600);

    await db
      .update(FileHosting)
      .set({ times: sql`${FileHosting.times} + 1`, updatedAt: new Date() })
      .where(eq(FileHosting.id, fileId));

    return withCors(
      new Response(null, {
        status: 302,
        headers: {
          Location: url,
        },
      }),
    );
  } catch (error) {
    return withCors(errorResp(error));
  }
}
