import { Decimal } from '@prisma/client/runtime/library';

export enum RechargeType {
  ALIPAY = 'alipay',
  STRIPE = 'stripe',
  ADMIN = 'admin',
  PROMOTION = 'promotion',
  SIGNUP = 'signup',
  GITHUB_SIGNUP = 'github_signup',
}

export enum RechargeStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
}

export const dollarToYuan = 7.5;

export const CREDIT_PER_REQUEST_SOCIAL_MEDIA = {
  X: new Decimal(0.001 * 10),
} as const;

export const PRICING = {
  DEFAULT: new Decimal(0.001 * 10),
  WEB_READER_API: new Decimal(0.00000002 * 10),
  WEB_SEARCH_API: new Decimal(0.00000002 * 10),
  LLM: {
    DEEPSEEK_CHAT: {
      INPUT: new Decimal(0.027 * 10).div(new Decimal(10 ** 6)),
      OUTPUT: new Decimal(0.11 * 10).div(new Decimal(10 ** 6)),
    },
  },
  IMAGE_GENERATION: new Decimal(0.004 * 10),
  POSTER_GENERATION: new Decimal(0.004 * 10),
  FILE_HOSTING: new Decimal(0.04),
  AUDIO_TRANSCRIPTION: new Decimal(0.000017 * 2),
} as const;

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
  MINIMUM_CONSUMPTION_ADJUSTMENT: 'minimum_consumption_adjustment',
  AUDIO_TRANSCRIPTION: 'audio_transcription',
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
