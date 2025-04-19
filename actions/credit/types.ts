import { Decimal } from '@prisma/client/runtime/library';

export enum RechargeType {
  ALIPAY = 'alipay',
  FREE = 'free',
  PROMOTION = 'promotion',
}

export enum RechargeStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
}

/**
 * 1 US dollar to CNY exchange rate
 */
export const dollarToYuan = 7.3;

// 定价
export const CREDIT_PER_TOEKN = {
  WEB_READER_API: new Decimal(0.0000002),
  WEB_SEARCH_API: new Decimal(0.0000002),
} as const;

export const CREDIT_PER_REQUEST_SOCIAL_MEDIA = {
  X: new Decimal(0.01),
} as const;

// 使用类型
export const USAGE_TYPE_MAP = {
  WEB_READER_API: 'Web Reader API',
  WEB_SEARCH_API: 'Web Search API',
  SOCIAL_MEDIA_X: 'Social Media X',
} as const;

export type UsageType = keyof typeof USAGE_TYPE_MAP;

export function getUsageType(type: string): string {
  return USAGE_TYPE_MAP[type as UsageType] || type;
}

export interface CreditInfo {
  credits: number;
  freeCredits: number;
  totalCredits: number;
}

export interface DeductCreditParams {
  userId: string;
  type: UsageType;
  amount: Decimal;
}

export interface DeductCreditResult {
  success: boolean;
  remainingCredits?: CreditInfo;
  error?: string;
  usage?: {
    credits: number;
  };
}
