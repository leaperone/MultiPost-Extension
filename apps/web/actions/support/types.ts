// Support ticket system shared types

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
