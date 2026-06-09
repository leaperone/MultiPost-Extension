import { createFileRoute } from '@tanstack/react-router';
import { createId } from '@paralleldrive/cuid2';
import { z } from 'zod';

import { getPresignedUploadUrl } from '@/lib/bitiful';

import { preCheckCredit } from '../../../../actions/credit/_core';
import { authKey } from '../../../../lib/authKey';
import { preflightResponse, withCors } from '../../../../lib/cors';
import { multipostDb } from '../../../../lib/db';
import { errorResp, successResp, unauthResp } from '../../../../lib/request';

const FILEHOSTING_BUCKET_FOLDER = 'filehosting';

const SOURCE_MAP = {
  USER_UPLOAD: 'USER_UPLOAD',
  IMAGE_GENERATION: 'IMAGE_GENERATION',
  POSTER_GENERATION: 'POSTER_GENERATION',
} as const;

const schema = z.object({
  filename: z.string().optional(),
});

export const Route = createFileRoute('/api/v1/file/create')({
  server: {
    handlers: {
      OPTIONS: async () => preflightResponse(),
      POST,
    },
  },
});

async function POST({ request }: { request: Request }) {
  try {
    const { userId } = await authKey(request);
    if (!userId) {
      return withCors(unauthResp());
    }

    const source = request.headers.get('X-Source');

    await preCheckCredit(userId);

    const body = await request.json();
    const { filename } = schema.parse(body);

    const fileId = createId();
    const fileKey = `${FILEHOSTING_BUCKET_FOLDER}/${fileId}`;

    await multipostDb.fileHosting.create({
      data: {
        id: fileId,
        key: fileKey,
        userId,
        expiredAt: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000),
        filename,
        source: SOURCE_MAP[source as keyof typeof SOURCE_MAP] || 'USER_UPLOAD',
      },
    });

    return withCors(
      successResp({
        fileId,
        url: await getPresignedUploadUrl(fileKey),
      }),
    );
  } catch (error) {
    return withCors(errorResp(error));
  }
}
