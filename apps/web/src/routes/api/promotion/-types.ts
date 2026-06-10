import type { PromotionTask } from '@db/schema/schema';

type PromotionTaskRow = typeof PromotionTask.$inferSelect;

export enum PromotionSubmissionStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export enum PromotionTaskType {
  PUBLISH_POST = 'PUBLISH_POST',
  COMMENT_POST = 'COMMENT_POST',
}

export const PromotionTaskTypeLabelMap = {
  [PromotionTaskType.PUBLISH_POST]: '发布帖子',
  [PromotionTaskType.COMMENT_POST]: '评论帖子',
} as const;

export type ClientPromotionTask = Omit<PromotionTaskRow, 'reward' | 'keywords' | 'examples'> & {
  reward: string;
  keywords: string[];
  examples: string[];
  code?: string;
  isVerified?: boolean;
};
