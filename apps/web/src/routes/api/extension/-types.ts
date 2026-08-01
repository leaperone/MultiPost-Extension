import { z } from 'zod';

export const TaskStatus = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  DONE: 'DONE',
  FAILED: 'FAILED',
} as const;

export const TaskType = {
  PUBLISH_POST: 'PUBLISH_POST',
  SCHEDULE_PUBLISH_POST: 'SCHEDULE_PUBLISH_POST',
  DRAFT_POST: 'DRAFT_POST',
} as const;

// Zod schemas
export const platformSchema = z.object({
  name: z.string().min(1),
  injectUrl: z.string().url().optional(),
  extraConfig: z.unknown().optional(),
});

export const fileDataSchema = z.object({
  url: z.string().url(),
  name: z.string().optional(),
  type: z.string().optional(),
  size: z.number().int().min(0).optional(),
  originUrl: z.string().url().optional(),
});

export const dynamicDataSchema = z.object({
  title: z.string().optional(),
  content: z.string(),
  images: z.array(fileDataSchema).optional(),
  videos: z.array(fileDataSchema).optional(),
  tags: z.array(z.string()).optional(),
  scheduledPublishTime: z.number().int().positive().optional(),
});

export const articleDataSchema = z.object({
  title: z.string(),
  cover: fileDataSchema,
  htmlContent: z.string(),
  markdownContent: z.string(),
  digest: z.string().optional(),
  images: z.array(fileDataSchema).optional(),
  tags: z.array(z.string()).optional(),
  category: z.union([z.string(), z.number()]).optional(),
  original: z.boolean().optional(),
  allowComment: z.boolean().optional(),
  scheduledPublishTime: z.number().int().positive().optional(),
});

export const videoDataSchema = z.object({
  title: z.string(),
  content: z.string(),
  video: fileDataSchema,
  cover: fileDataSchema.optional(),
  verticalCover: fileDataSchema.optional(),
  horizontalCover: fileDataSchema.optional(),
  tags: z.array(z.string()).optional(),
  scheduledPublishTime: z.number().int().positive().optional(),
  category: z.union([z.string(), z.number()]).optional(),
  original: z.boolean().optional(),
  collectionId: z.union([z.string(), z.number()]).optional(),
  description: z.string().optional(),
});

export const podcastDataSchema = z.object({
  title: z.string(),
  description: z.string(),
  audio: fileDataSchema,
  cover: fileDataSchema.optional(),
  tags: z.array(z.string()).optional(),
  category: z.union([z.string(), z.number()]).optional(),
});

export const draftPostSchema = z.object({
  draftId: z.string(),
  platforms: z.array(platformSchema).min(1),
  timestamp: z.number().int().positive().default(Date.now()),
});

export const publishPostSchema = z.object({
  platforms: z.array(platformSchema).min(1),
  isAutoPublish: z.boolean().default(false),
  data: z.union([dynamicDataSchema, articleDataSchema, videoDataSchema, podcastDataSchema]),
});

export const schedulePublishPostSchema = publishPostSchema.extend({
  timestamp: z.number().int().positive(),
});

export const taskSchema = z.discriminatedUnion('taskType', [
  z.object({
    targetClientId: z.string().min(1),
    taskType: z.literal(TaskType.PUBLISH_POST),
    taskData: publishPostSchema,
  }),
  z.object({
    targetClientId: z.string().min(1),
    taskType: z.literal(TaskType.SCHEDULE_PUBLISH_POST),
    taskData: schedulePublishPostSchema,
  }),
  z.object({
    targetClientId: z.string().min(1),
    taskType: z.literal(TaskType.DRAFT_POST),
    taskData: draftPostSchema,
  }),
]);

export type TaskData = z.infer<typeof taskSchema>;
export type PublishPostData = z.infer<typeof publishPostSchema>;
export type SchedulePublishPostData = z.infer<typeof schedulePublishPostSchema>;
export type DraftPostData = z.infer<typeof draftPostSchema>;
