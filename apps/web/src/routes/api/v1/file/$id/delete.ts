import { createFileRoute } from '@tanstack/react-router';

import { deleteObject } from '@/lib/bitiful';

import { preflightResponse, withCors } from '../../../../../lib/cors';
import { multipostDb } from '../../../../../lib/db';
import { errorResp, successResp } from '../../../../../lib/request';
import { initFile, optionalFileAuth } from '../-common';

export const Route = createFileRoute('/api/v1/file/$id/delete')({
  server: {
    handlers: {
      OPTIONS: async () => preflightResponse(),
      POST,
    },
  },
});

async function POST({ request, params }: { request: Request; params: { id: string } }) {
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

    if (file.deletedAt) {
      throw new Error('File already deleted');
    }

    await deleteObject(file.key);

    const updatedFile = await multipostDb.fileHosting.update({
      where: { id: fileId },
      data: {
        deletedAt: new Date(),
        previewUrl: null,
      },
    });

    return withCors(
      successResp({
        fileId,
        message: 'File deleted successfully',
        deletedAt: updatedFile.deletedAt,
        filename: file.filename,
      }),
    );
  } catch (error) {
    return withCors(errorResp(error));
  }
}
