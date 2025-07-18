import { authKey } from '@/actions/authKey';
import { NextRequest } from 'next/server';
import { createId } from '@paralleldrive/cuid2';
import { getPresignedUploadUrl } from '@/lib/bitiful';
import { successResp, errorResp, unauthResp } from '@/lib/request';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { preCheckCredit } from '@/actions/credit';

const FILEHOSTING_BUCKET_FOLDER = 'filehosting';

const SOURCE_MAP = {
  USER_UPLOAD: 'USER_UPLOAD',
  IMAGE_GENERATION: 'IMAGE_GENERATION',
  POSTER_GENERATION: 'POSTER_GENERATION',
};

const schema = z.object({
  filename: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // 鉴权
    const { userId } = await authKey(req);
    if (!userId) {
      return unauthResp();
    }

    const source = req.headers.get('X-Source');

    await preCheckCredit(userId);

    const body = await req.json();
    const { filename } = schema.parse(body);

    const fileId = createId();
    const fileKey = `${FILEHOSTING_BUCKET_FOLDER}/${fileId}`;

    await prisma.fileHosting.create({
      data: {
        id: fileId,
        key: fileKey,
        userId,
        expiredAt: new Date(new Date().getTime() + 10 * 365 * 24 * 60 * 60 * 1000),
        filename,
        source: SOURCE_MAP[source as keyof typeof SOURCE_MAP] || 'USER_UPLOAD',
      },
    });

    return successResp({
      fileId,
      url: await getPresignedUploadUrl(fileKey),
    });
  } catch (error) {
    return errorResp(error);
  }
}
