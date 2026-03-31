import { NextRequest } from 'next/server';
import { deleteObject } from '@/lib/bitiful';
import { successResp, errorResp } from '@/lib/request';
import { prisma } from '@/lib/db';
import { initFile } from '../common';

/**
 * Delete file from storage and mark as deleted in database
 * @param req - NextRequest object
 * @param params - Route parameters containing file id
 * @returns Success response with deletion info or error response
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const fileId = (await params).id;
    if (!fileId) {
      throw new Error('fileId is required');
    }

    const { success, file, error } = await initFile(fileId);
    if (!success || !file) {
      throw new Error(error);
    }

    // Check if file is already deleted
    if (file.deletedAt) {
      throw new Error('File already deleted');
    }

    // Delete file from Bitiful storage
    await deleteObject(file.key);

    // Update database to mark file as deleted
    const updatedFile = await prisma.fileHosting.update({
      where: { id: fileId },
      data: {
        deletedAt: new Date(),
        // Optionally clear preview URL since file is deleted
        previewUrl: null,
      },
    });

    return successResp({
      fileId,
      message: 'File deleted successfully',
      deletedAt: updatedFile.deletedAt,
      filename: file.filename,
    });
  } catch (error) {
    return errorResp(error);
  }
}
