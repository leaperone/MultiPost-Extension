import { createServerFn } from '@tanstack/react-start';
import crypto from 'node:crypto';

import { getPresignedUploadUrl } from '@/lib/bitiful';
import { getSession } from '../../lib/session';
import {
  feedbackUploadSchema,
  type FeedbackUploadResult,
} from './types';

const ALLOWED_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp']);

function pickExtension(filename: string | undefined): string {
  if (!filename) return 'png';
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!ext || !ALLOWED_EXTS.has(ext)) return 'png';
  return ext;
}

/**
 * Generate a presigned PUT URL for uploading a feedback screenshot to Bitiful.
 * Authenticated users only. Key shape: feedback/<userId>/<uuid>.<ext>
 */
export const getFeedbackUploadUrl = createServerFn({ method: 'POST' })
  .validator(feedbackUploadSchema)
  .handler(async ({ data }): Promise<FeedbackUploadResult> => {
    const session = await getSession();
    const userId = session?.user?.id;
    if (!userId) {
      return { success: false, error: 'Unauthenticated' };
    }

    const ext = pickExtension(data.filename);
    const uuid = crypto.randomUUID();
    const key = `feedback/${userId}/${uuid}.${ext}`;

    try {
      const uploadUrl = await getPresignedUploadUrl(key, 15 * 60);
      return { success: true, key, uploadUrl };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create upload URL',
      };
    }
  });
