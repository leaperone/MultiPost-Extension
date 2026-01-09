import { z } from 'zod';

/**
 * Video transcription status
 */
export const VideoTranscriptionStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type VideoTranscriptionStatusType =
  (typeof VideoTranscriptionStatus)[keyof typeof VideoTranscriptionStatus];

/**
 * Video metadata schema
 */
export const VideoMetadataSchema = z.object({
  title: z.string().optional(),
  author: z.string().optional(),
  authorId: z.string().optional(),
  coverUrl: z.string().optional(),
});

export type VideoMetadata = z.infer<typeof VideoMetadataSchema>;

/**
 * Input schema for creating a new transcription task
 */
export const CreateTranscriptionSchema = z.object({
  videoUrl: z.string().min(1, '视频链接不能为空'),
  videoId: z.string().optional(),
  platform: z.string().optional(),
  audioUrl: z.string().optional(),
  duration: z.number().optional(),
  metadata: VideoMetadataSchema.optional(),
});

export type CreateTranscriptionInput = z.infer<typeof CreateTranscriptionSchema>;

/**
 * Video extract result from TikHub API
 */
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
}
