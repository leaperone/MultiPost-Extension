import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { multipostDb } from '../../lib/db';
import type { RespT } from '../../lib/request';
import { getSession } from '../../lib/session';
import { isAdmin } from '../admin';

type SerializableJson =
  | string
  | number
  | boolean
  | null
  | SerializableJson[]
  | { [key: string]: SerializableJson };

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
  metadata: SerializableJson;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
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

const getVideoTranscriptionsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
  email: z.string().optional(),
});

const emptySchema = z.object({});

async function requireAdmin() {
  const session = await getSession();
  if (!session?.user?.id || !session.user.email) return null;
  if (!isAdmin(session.user.email)) return null;
  return session;
}

function unauthorized<T>(data: T): RespT<T> {
  return { code: -1, msg: 'You are not an admin', data };
}

function toSerializableJson(value: unknown): SerializableJson {
  if (value === undefined) return null;

  const serialized = JSON.stringify(value);
  if (serialized === undefined) return null;

  return JSON.parse(serialized) as SerializableJson;
}

export const getVideoTranscriptions = createServerFn({ method: 'GET' })
  .validator(getVideoTranscriptionsSchema)
  .handler(async ({ data }): Promise<RespT<GetVideoTranscriptionsResult>> => {
    const session = await requireAdmin();
    if (!session) return unauthorized({ transcriptions: [], count: 0 });

    const limit = data.limit ?? 20;
    const where: {
      id?: { lt: string };
      user?: { email: { contains: string; mode: 'insensitive' } };
    } = {};

    if (data.cursor) where.id = { lt: data.cursor };
    if (data.email) {
      where.user = {
        email: {
          contains: data.email,
          mode: 'insensitive',
        },
      };
    }

    const [transcriptions, count] = await Promise.all([
      multipostDb.videoTranscription.findMany({
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
      }),
      multipostDb.videoTranscription.count({ where }),
    ]);

    return {
      code: 0,
      msg: 'success',
      data: {
        transcriptions: transcriptions.map((record) => ({
          id: record.id,
          userId: record.userId,
          videoUrl: record.videoUrl,
          videoId: record.videoId,
          platform: record.platform,
          audioUrl: record.audioUrl,
          duration: record.duration,
          transcript: record.transcript,
          status: record.status,
          error: record.error,
          metadata: toSerializableJson(record.metadata),
          createdAt: record.createdAt.toISOString(),
          updatedAt: record.updatedAt.toISOString(),
          user: record.user,
        })),
        count,
        nextCursor: transcriptions.length === limit ? transcriptions[transcriptions.length - 1]?.id : undefined,
      },
    };
  });

export const getTranscriptionStats = createServerFn({ method: 'GET' })
  .validator(emptySchema)
  .handler(async (): Promise<RespT<TranscriptionStats>> => {
    const session = await requireAdmin();
    const empty = { total: 0, completed: 0, processing: 0, failed: 0, uniqueUsers: 0 };
    if (!session) return unauthorized(empty);

    const [total, completed, processing, failed, uniqueUsersResult] = await Promise.all([
      multipostDb.videoTranscription.count(),
      multipostDb.videoTranscription.count({ where: { status: 'completed' } }),
      multipostDb.videoTranscription.count({ where: { status: 'processing' } }),
      multipostDb.videoTranscription.count({ where: { status: 'failed' } }),
      multipostDb.videoTranscription.groupBy({
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
  });
