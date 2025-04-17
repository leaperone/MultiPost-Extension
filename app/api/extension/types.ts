import { z } from 'zod';

export const TaskStatus = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  DONE: 'DONE',
} as const;

export const TaskType = {
  PUBLISH_POST: 'PUBLISH_POST',
  SCHEDULE_PUBLISH_POST: 'SCHEDULE_PUBLISH_POST',
} as const;

// Zod schemas
export const platformSchema = z.object({
  name: z.string(),
  injectUrl: z.string().url(),
  extraConfig: z
    .object({
      customInjectUrls: z.array(z.string().url()).optional(),
    })
    .or(z.unknown())
    .optional(),
});

export const fileDataSchema = z.object({
  name: z.string(),
  url: z.string().url(),
  type: z.string().optional(),
  size: z.number().int().min(0).optional(),
  originUrl: z.string().url().optional(),
});

export const dynamicDataSchema = z.object({
  title: z.string(),
  content: z.string(),
  images: z.array(fileDataSchema).optional(),
  videos: z.array(fileDataSchema).optional(),
});

export const articleDataSchema = z.object({
  title: z.string(),
  content: z.string(),
  digest: z.string(),
  cover: fileDataSchema,
  images: z.array(fileDataSchema).optional(),
  videos: z.array(fileDataSchema).optional(),
  fileDatas: z.array(fileDataSchema).optional(),
  originContent: z.string().optional(),
  markdownContent: z.string().optional(),
  markdownOriginContent: z.string().optional(),
});

export const videoDataSchema = z.object({
  title: z.string(),
  content: z.string(),
  video: fileDataSchema,
});

export const publishPostSchema = z.object({
  platforms: z.array(platformSchema),
  isAutoPublish: z.boolean().default(false),
  data: dynamicDataSchema,
});

export const schedulePublishPostSchema = publishPostSchema.extend({
  timestamp: z.number().int().positive(),
});

export const taskSchema = z.object({
  targetClientId: z.string(),
  taskType: z.enum([TaskType.PUBLISH_POST, TaskType.SCHEDULE_PUBLISH_POST]),
  taskData: z.union([publishPostSchema, schedulePublishPostSchema]),
});

export type TaskData = z.infer<typeof taskSchema>;
export type PublishPostData = z.infer<typeof publishPostSchema>;
export type SchedulePublishPostData = z.infer<typeof schedulePublishPostSchema>;