import { createFileRoute } from '@tanstack/react-router';

import { getPresignedDownloadUrl } from '@/lib/bitiful';

import { preflightResponse, withCors } from '../../../../../lib/cors';
import { multipostDb } from '../../../../../lib/db';
import { errorResp, successResp } from '../../../../../lib/request';
import { fileMetadata, initFile, optionalFileAuth } from '../-common';

export const Route = createFileRoute('/api/v1/file/$id/get')({
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

    await multipostDb.fileHosting.update({
      where: { id: fileId },
      data: { times: { increment: 1 } },
    });

    return withCors(
      successResp({
        ...fileMetadata(fileId, file),
        url,
      }),
    );
  } catch (error) {
    return withCors(errorResp(error));
  }
}
