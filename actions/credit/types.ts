import { Decimal } from '@prisma/client/runtime/library';

export enum RechargeType {
  ALIPAY = 'alipay',
  ADMIN = 'admin',
  PROMOTION = 'promotion',
  SIGNUP = 'signup',
}

export enum RechargeStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
}

export const dollarToYuan = 7.3;

// 定价
export const CREDIT_PER_REQUEST_SOCIAL_MEDIA = {
  X: new Decimal(0.001 * 10),
} as const;

export const PRICING = {
  DEFAULT: new Decimal(0.001 * 10), // per token
  WEB_READER_API: new Decimal(0.00000002 * 10), // per token
  WEB_SEARCH_API: new Decimal(0.00000002 * 10), // per token
  LLM: {
    DEEPSEEK_CHAT: {
      INPUT: new Decimal(0.027 * 10).div(new Decimal(10 ** 6)), // per token
      OUTPUT: new Decimal(0.11 * 10).div(new Decimal(10 ** 6)), // per token
    },
  },
  IMAGE_GENERATION: new Decimal(0.04 * 10), // per image
  POSTER_GENERATION: new Decimal(0.04 * 10), // per image
  FILE_HOSTING: new Decimal(0.04), // 1GB Transfer
} as const;

// 使用类型
export const USAGE_TYPE_MAP = {
  WEB_READER_API: 'web_reader_api',
  WEB_SEARCH_API: 'web_search_api',
  SOCIAL_MEDIA_DEFAULT: 'social_media_default',
  SOCIAL_MEDIA_X: 'social_media_x',
  SOCIAL_MEDIA_REDNOTE: 'social_media_rednote',
  LLM_DEEPSEEK_CHAT_INPUT: 'llm_deepseek_chat_input',
  LLM_DEEPSEEK_CHAT_OUTPUT: 'llm_deepseek_chat_output',
  IMAGE_GENERATION: 'image_generation',
  POSTER_GENERATION: 'poster_generation',
  FILE_HOSTING: 'file_hosting',
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

export interface BatchDeductCreditParams {
  userId: string;
  records: Array<{
    type: UsageType;
    amount: Decimal;
  }>;
}

export interface BatchDeductCreditResult {
  success: boolean;
  remainingCredits?: CreditInfo;
  error?: string;
  failedRecords?: Array<{
    type: UsageType;
    amount: Decimal;
    error: string;
  }>;
  usage?: {
    credits: number;
  };
}
