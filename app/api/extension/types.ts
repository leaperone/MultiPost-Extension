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

export const publishPostSchema = z.object({
  platforms: z.array(platformSchema),
  isAutoPublish: z.boolean().default(false),
  data: z.unknown(),
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