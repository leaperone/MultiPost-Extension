import { createServerFn } from '@tanstack/react-start';
import { User } from '@db/schema/auth-schema';
import { VideoTranscription } from '@db/schema/schema';
import { and, count, countDistinct, desc, eq, ilike, lt, type SQL } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../../lib/db';
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

function andAll(conditions: (SQL | undefined)[]) {
  const filtered = conditions.filter((condition): condition is SQL => Boolean(condition));
  return filtered.length > 0 ? and(...filtered) : undefined;
}

function videoTranscriptionWhere(data: z.infer<typeof getVideoTranscriptionsSchema>) {
  return andAll([
    data.cursor ? lt(VideoTranscription.id, data.cursor) : undefined,
    data.email ? ilike(User.email, `%${data.email}%`) : undefined,
  ]);
}

export const getVideoTranscriptions = createServerFn({ method: 'GET' })
  .validator(getVideoTranscriptionsSchema)
  .handler(async ({ data }): Promise<RespT<GetVideoTranscriptionsResult>> => {
    const session = await requireAdmin();
    if (!session) return unauthorized({ transcriptions: [], count: 0 });

    const limit = data.limit ?? 20;
    const where = videoTranscriptionWhere(data);

    const [transcriptions, countRows] = await Promise.all([
      db
        .select({
          id: VideoTranscription.id,
          userId: VideoTranscription.userId,
          videoUrl: VideoTranscription.videoUrl,
          videoId: VideoTranscription.videoId,
          platform: VideoTranscription.platform,
          audioUrl: VideoTranscription.audioUrl,
          duration: VideoTranscription.duration,
          transcript: VideoTranscription.transcript,
          status: VideoTranscription.status,
          error: VideoTranscription.error,
          metadata: VideoTranscription.metadata,
          createdAt: VideoTranscription.createdAt,
          updatedAt: VideoTranscription.updatedAt,
          user: {
            id: User.id,
            name: User.name,
            email: User.email,
            image: User.image,
          },
        })
        .from(VideoTranscription)
        .innerJoin(User, eq(VideoTranscription.userId, User.id))
        .where(where)
        .orderBy(desc(VideoTranscription.createdAt))
        .limit(limit),
      db
        .select({ count: count() })
        .from(VideoTranscription)
        .innerJoin(User, eq(VideoTranscription.userId, User.id))
        .where(where),
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
        count: countRows[0]?.count ?? 0,
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
      db.select({ count: count() }).from(VideoTranscription),
      db
        .select({ count: count() })
        .from(VideoTranscription)
        .where(eq(VideoTranscription.status, 'completed')),
      db
        .select({ count: count() })
        .from(VideoTranscription)
        .where(eq(VideoTranscription.status, 'processing')),
      db
        .select({ count: count() })
        .from(VideoTranscription)
        .where(eq(VideoTranscription.status, 'failed')),
      db.select({ count: countDistinct(VideoTranscription.userId) }).from(VideoTranscription),
    ]);

    return {
      code: 0,
      msg: 'success',
      data: {
        total: total[0]?.count ?? 0,
        completed: completed[0]?.count ?? 0,
        processing: processing[0]?.count ?? 0,
        failed: failed[0]?.count ?? 0,
        uniqueUsers: uniqueUsersResult[0]?.count ?? 0,
      },
    };
  });
