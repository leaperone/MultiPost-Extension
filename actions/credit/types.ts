import { Decimal } from '@prisma/client/runtime/library';

export const CREDIT_PER_TOEKN = {
  WEB_SCRAPER_API: new Decimal(0.0000002),
  SEARCH_API: new Decimal(0.0000002),
} as const;

export const USAGE_TYPE_MAP = {
  WEB_SCRAPER_API: 'Web Scraper API',
  SEARCH_API: 'Search API',
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
