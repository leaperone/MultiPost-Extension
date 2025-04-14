import { Decimal } from '@prisma/client/runtime/library';

export const USAGE_TYPE_MAP = {
  WEBSITE_SCRAPER_API: 'Website Scraper API',
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
}
