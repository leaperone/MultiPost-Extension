import { z } from 'zod';

export const ERROR_TYPES = {
  CANNOT_PUBLISH: 'cannotPublish',
  CONTENT_MISSING: 'contentMissing',
  ACCOUNT_ISSUE: 'accountIssue',
  OTHER: 'other',
} as const;

export type ErrorType = (typeof ERROR_TYPES)[keyof typeof ERROR_TYPES];

export const FEEDBACK_SOURCES = {
  PUBLISH_TASK_LOG: 'publish-task-log',
  DESKTOP_HISTORY: 'desktop-history',
  GLOBAL_MENU: 'global-menu',
  COMMUNITY_PAGE: 'community-page',
} as const;

export type FeedbackSource = (typeof FEEDBACK_SOURCES)[keyof typeof FEEDBACK_SOURCES];

export const feedbackUploadSchema = z.object({
  filename: z.string().max(255).optional(),
});

export const reportPublishErrorSchema = z.object({
  platform: z.string().max(64).optional(),
  taskId: z.string().max(128).optional(),
  logId: z.string().max(128).optional(),
  status: z.string().max(64).optional(),
  errorMessage: z.string().max(2000).optional(),
  description: z.string().min(1).max(2000),
  errorType: z.enum([
    ERROR_TYPES.CANNOT_PUBLISH,
    ERROR_TYPES.CONTENT_MISSING,
    ERROR_TYPES.ACCOUNT_ISSUE,
    ERROR_TYPES.OTHER,
  ]),
  source: z.enum([
    FEEDBACK_SOURCES.PUBLISH_TASK_LOG,
    FEEDBACK_SOURCES.DESKTOP_HISTORY,
    FEEDBACK_SOURCES.GLOBAL_MENU,
    FEEDBACK_SOURCES.COMMUNITY_PAGE,
  ]),
  screenshotKey: z
    .string()
    .max(256)
    .regex(/^feedback\/[\w-]+\/[\w-]+\.(png|jpe?g|webp)$/)
    .optional(),
  page: z.string().max(512).optional(),
});

export type FeedbackUploadInput = z.infer<typeof feedbackUploadSchema>;

export interface FeedbackUploadResult {
  success: boolean;
  key?: string;
  uploadUrl?: string;
  error?: string;
}

export type ReportPublishErrorInput = z.infer<typeof reportPublishErrorSchema>;

export interface ReportPublishErrorResult {
  ok: boolean;
  eventId?: string;
  error?: string;
}
