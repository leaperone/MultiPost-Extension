import { NextRequest } from 'next/server';
import { successResp, errorResp } from '@/lib/request';
import { initFile } from '../common';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const fileId = (await params).id;
    if (!fileId) {
      return errorResp('fileId is required');
    }

    const { success, file, error } = await initFile(fileId);
    if (!success || !file) {
      throw new Error(error);
    }

    return successResp({
      fileId,
      type: file.type,
      size: file.size,
      filename: file.filename,
      expiredAt: file.expiredAt,
    });
  } catch (error) {
    return errorResp(error);
  }
}
