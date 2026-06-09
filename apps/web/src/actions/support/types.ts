import { z } from 'zod';

export const SUPPORT_STATUS = {
  open: 'open',
  pending: 'pending',
  in_progress: 'in_progress',
  resolved: 'resolved',
  closed: 'closed',
} as const;
export type SupportStatus = (typeof SUPPORT_STATUS)[keyof typeof SUPPORT_STATUS];

export const SUPPORT_CATEGORY = {
  bug: 'bug',
  suggestion: 'suggestion',
  account: 'account',
  other: 'other',
} as const;
export type SupportCategory = (typeof SUPPORT_CATEGORY)[keyof typeof SUPPORT_CATEGORY];

export const SUPPORT_PRIORITY = {
  low: 'low',
  normal: 'normal',
  high: 'high',
  urgent: 'urgent',
} as const;
export type SupportPriority = (typeof SUPPORT_PRIORITY)[keyof typeof SUPPORT_PRIORITY];

export const SUPPORT_MESSAGE_ROLE = {
  user: 'user',
  ai: 'ai',
  agent: 'agent',
} as const;
export type SupportMessageRole = (typeof SUPPORT_MESSAGE_ROLE)[keyof typeof SUPPORT_MESSAGE_ROLE];

export interface Attachment {
  type: string;
  key: string;
  url?: string;
}

export interface CreateConversationData {
  subject: string;
  category?: SupportCategory;
  priority?: SupportPriority;
  content: string;
  pageUrl?: string;
  screenshotKey?: string;
  attachmentKeys?: string[];
  appState?: unknown;
  browserInfo?: unknown;
}

export const supportStatusSchema = z.enum([
  SUPPORT_STATUS.open,
  SUPPORT_STATUS.pending,
  SUPPORT_STATUS.in_progress,
  SUPPORT_STATUS.resolved,
  SUPPORT_STATUS.closed,
]);

export const supportCategorySchema = z.enum([
  SUPPORT_CATEGORY.bug,
  SUPPORT_CATEGORY.suggestion,
  SUPPORT_CATEGORY.account,
  SUPPORT_CATEGORY.other,
]);

export const supportPrioritySchema = z.enum([
  SUPPORT_PRIORITY.low,
  SUPPORT_PRIORITY.normal,
  SUPPORT_PRIORITY.high,
  SUPPORT_PRIORITY.urgent,
]);

export const supportConversationIdSchema = z.object({
  conversationId: z.string().min(1),
});

export const getSupportUploadUrlSchema = z.object({
  conversationId: z.string().optional(),
});

export const createConversationSchema = z.object({
  subject: z.string().optional(),
  category: supportCategorySchema.optional(),
  priority: supportPrioritySchema.optional(),
  content: z.string().optional(),
  pageUrl: z.string().optional(),
  screenshotKey: z.string().optional(),
  attachmentKeys: z.array(z.string()).optional(),
  appState: z.unknown().optional(),
  browserInfo: z.unknown().optional(),
});

export const getConversationsSchema = z.object({
  page: z.number().optional(),
  pageSize: z.number().optional(),
});

export const addMessageSchema = z.object({
  conversationId: z.string().min(1),
  content: z.string().optional(),
  attachmentKeys: z.array(z.string()).optional(),
});

export const rateConversationSchema = z.object({
  conversationId: z.string().min(1),
  rating: z.number(),
  comment: z.string().optional(),
});

export const adminGetConversationsSchema = z.object({
  status: supportStatusSchema.optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  page: z.number().optional(),
  pageSize: z.number().optional(),
});

export const adminReplyConversationSchema = z.object({
  conversationId: z.string().min(1),
  content: z.string().optional(),
});

export const adminUpdateStatusSchema = z.object({
  conversationId: z.string().min(1),
  status: supportStatusSchema,
});

export const adminAssignConversationSchema = z.object({
  conversationId: z.string().min(1),
  assigneeId: z.string().nullable(),
});

export const adminAddInternalNoteSchema = z.object({
  conversationId: z.string().min(1),
  content: z.string().optional(),
});

export const adminGetStatsSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type AdminGetConversationsParams = z.infer<typeof adminGetConversationsSchema>;
export type AdminGetStatsParams = z.infer<typeof adminGetStatsSchema>;
