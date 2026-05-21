'use server';

import crypto from 'node:crypto';

import { auth } from '@/auth';
import { getPresignedUploadUrl } from '@/lib/bitiful';

export interface FeedbackUploadResult {
  success: boolean;
  key?: string;
  uploadUrl?: string;
  error?: string;
}

const ALLOWED_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp']);

function pickExtension(filename: string | undefined): string {
  if (!filename) return 'png';
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!ext || !ALLOWED_EXTS.has(ext)) return 'png';
  return ext;
}

/**
 * Generate a presigned PUT URL for uploading a feedback screenshot to Bitiful.
 * Authenticated users only — prevents anonymous abuse of the storage bucket.
 * Key shape: feedback/<userId>/<uuid>.<ext>
 */
export async function getFeedbackUploadUrl(filename?: string): Promise<FeedbackUploadResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { success: false, error: 'Unauthenticated' };
  }
  const ext = pickExtension(filename);
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
}
