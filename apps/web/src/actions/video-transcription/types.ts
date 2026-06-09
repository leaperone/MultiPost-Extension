import { z } from 'zod';

export const VideoTranscriptionStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type VideoTranscriptionStatusType =
  (typeof VideoTranscriptionStatus)[keyof typeof VideoTranscriptionStatus];

export const VideoMetadataSchema = z.object({
  title: z.string().optional(),
  author: z.string().optional(),
  authorId: z.string().optional(),
  coverUrl: z.string().optional(),
});

export type VideoMetadata = z.infer<typeof VideoMetadataSchema>;

export const CreateTranscriptionSchema = z.object({
  videoUrl: z.string().min(1, '视频链接不能为空'),
  videoId: z.string().optional(),
  platform: z.string().optional(),
  audioUrl: z.string().optional(),
  duration: z.number().optional(),
  metadata: VideoMetadataSchema.optional(),
});

export type CreateTranscriptionInput = z.infer<typeof CreateTranscriptionSchema>;

export const videoTranscriptionTaskIdSchema = z.object({
  taskId: z.string().min(1),
});

export const listVideoTranscriptionsSchema = z.object({
  status: z.string().optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
});

export const getVideoTranscriptionsByIdsSchema = z.object({
  taskIds: z.array(z.string()),
});

export interface VideoExtractResult {
  videoId: string;
  platform: string;
  title: string;
  author: string;
  authorId: string;
  audioUrl: string;
  videoUrl: string;
  coverUrl: string;
  duration: number;
  transcript?: string;
  taskId?: string;
}
