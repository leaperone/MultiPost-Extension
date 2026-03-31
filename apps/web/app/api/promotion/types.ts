import type { PromotionTask } from '@/prisma/client_multipost';

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

export type ClientPromotionTask = Omit<PromotionTask, 'reward'> & {
  reward: string;
  code?: string;
  isVerified?: boolean;
};
