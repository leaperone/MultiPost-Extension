'use server';

import { prisma } from '@/lib/db';
import { RespT } from '@/lib/request';
import { isAdmin } from '@/actions/admin';
import { auth } from '@/auth';

export interface VideoTranscriptionRecord {
  id: string;
  userId: string;
  videoUrl: string;
  videoId: string | null;
  platform: string | null;
  audioUrl: string | null;
  duration: number | null;
  transcript: string | null;
  status: string;
  error: string | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

export interface GetVideoTranscriptionsParams {
  cursor?: string;
  limit?: number;
  email?: string;
}

export interface GetVideoTranscriptionsResult {
  transcriptions: VideoTranscriptionRecord[];
  count: number;
  nextCursor?: string;
}

export interface TranscriptionStats {
  total: number;
  completed: number;
  processing: number;
  failed: number;
  uniqueUsers: number;
}

export async function getVideoTranscriptions({
  cursor,
  limit = 20,
  email,
}: GetVideoTranscriptionsParams = {}): Promise<RespT<GetVideoTranscriptionsResult>> {
  const session = await auth();
  if (!session) {
    return { code: -1, msg: 'Please login', data: { transcriptions: [], count: 0 } };
  }
  if (!isAdmin(session.user.email?.toString() ?? '')) {
    return { code: -1, msg: 'You are not an admin', data: { transcriptions: [], count: 0 } };
  }

  const where: Record<string, unknown> = {};

  if (cursor) {
    where.id = { lt: cursor };
  }

  if (email) {
    where.user = {
      email: {
        contains: email,
        mode: 'insensitive',
      },
    };
  }

  const transcriptions = (await prisma.videoTranscription.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  })) as VideoTranscriptionRecord[];

  const count = await prisma.videoTranscription.count({ where });
  const nextCursor = transcriptions.length === limit ? transcriptions[transcriptions.length - 1].id : undefined;

  return { code: 0, msg: 'success', data: { transcriptions, count, nextCursor } };
}

export async function getTranscriptionStats(): Promise<RespT<TranscriptionStats>> {
  const session = await auth();
  if (!session) {
    return {
      code: -1,
      msg: 'Please login',
      data: { total: 0, completed: 0, processing: 0, failed: 0, uniqueUsers: 0 },
    };
  }
  if (!isAdmin(session.user.email?.toString() ?? '')) {
    return {
      code: -1,
      msg: 'You are not an admin',
      data: { total: 0, completed: 0, processing: 0, failed: 0, uniqueUsers: 0 },
    };
  }

  const [total, completed, processing, failed, uniqueUsersResult] = await Promise.all([
    prisma.videoTranscription.count(),
    prisma.videoTranscription.count({ where: { status: 'completed' } }),
    prisma.videoTranscription.count({ where: { status: 'processing' } }),
    prisma.videoTranscription.count({ where: { status: 'failed' } }),
    prisma.videoTranscription.groupBy({
      by: ['userId'],
      _count: { userId: true },
    }),
  ]);

  return {
    code: 0,
    msg: 'success',
    data: {
      total,
      completed,
      processing,
      failed,
      uniqueUsers: uniqueUsersResult.length,
    },
  };
}
