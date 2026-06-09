import { createFileRoute } from '@tanstack/react-router';

import { preflightResponse, withCors } from '../../../../../lib/cors';
import { errorResp, successResp } from '../../../../../lib/request';
import { fileMetadata, initFile, optionalFileAuth } from '../-common';

export const Route = createFileRoute('/api/v1/file/$id/info')({
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
      return withCors(errorResp('fileId is required'));
    }

    const { success, file, error } = await initFile(fileId);
    if (!success || !file) {
      throw new Error(error);
    }

    return withCors(successResp(fileMetadata(fileId, file)));
  } catch (error) {
    return withCors(errorResp(error));
  }
}
