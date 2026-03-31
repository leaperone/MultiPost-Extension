export const FEEDBACK_CATEGORIES = {
  bug: 'bug',
  suggestion: 'suggestion',
  account: 'account',
  other: 'other',
} as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[keyof typeof FEEDBACK_CATEGORIES];

export const CONTACT_METHODS = {
  phone: 'phone',
  email: 'email',
  bilibili: 'bilibili',
  douyin: 'douyin',
  custom: 'custom',
} as const;

export type ContactMethod = (typeof CONTACT_METHODS)[keyof typeof CONTACT_METHODS];

export interface SubmitFeedbackData {
  category: FeedbackCategory;
  title: string;
  content: string;
  contactMethod?: ContactMethod;
  contactValue?: string;
  screenshot?: string;
  browserInfo?: string;
  appState?: string;
  pageUrl?: string;
}

export interface SubmitFeedbackResult {
  success: boolean;
  message?: string;
}
