import { fetchTikhub } from '@/lib/tikhub';
import type { UsageType } from '@/actions/credit/types';

import { deductCredit } from '../../../../actions/credit/_core';
import { authKey } from '../../../../lib/authKey';
import { withCors } from '../../../../lib/cors';
import { errorResponse, unauthenticatedResponse } from '../../../../lib/response';

type CreditAmount = Parameters<typeof deductCredit>[0]['amount'];
type CreditUsage = { credits: number } | undefined;
type QueryInput = Record<string, string> | (() => Record<string, string>);

type SocialProxyOptions = {
  request: Request;
  type: UsageType;
  amount: CreditAmount;
  endpoint: string;
  query: QueryInput;
};

type SocialFallbackOptions = Omit<SocialProxyOptions, 'endpoint'> & {
  endpoints: string[];
};

export function searchParamsObject(request: Request) {
  return Object.fromEntries(new URL(request.url).searchParams);
}

export function endpointWithQuery(endpoint: string, query: Record<string, string>) {
  return `${endpoint}?${new URLSearchParams(query)}`;
}

function resolveQuery(query: QueryInput) {
  return typeof query === 'function' ? query() : query;
}

export function successSocialResponse(data: unknown, usage: CreditUsage) {
  return withCors(
    Response.json({
      success: true,
      data,
      usage,
    }),
  );
}

export function socialErrorResponse(error: unknown) {
  return withCors(errorResponse(error));
}

async function requireUserId(request: Request) {
  const { userId } = await authKey(request);
  if (!userId) {
    return { response: withCors(unauthenticatedResponse()) };
  }

  return { userId };
}

async function deductSocialCredit(userId: string, type: UsageType, amount: CreditAmount) {
  const creditResult = await deductCredit({
    userId,
    type,
    amount,
  });

  if (!creditResult.success) {
    throw new Error(creditResult.error || 'Insufficient credits');
  }

  return creditResult.usage;
}

export async function runSocialProxy(options: SocialProxyOptions) {
  const auth = await requireUserId(options.request);
  if ('response' in auth) {
    return auth.response;
  }

  const query = resolveQuery(options.query);
  const usage = await deductSocialCredit(auth.userId, options.type, options.amount);
  const response = await fetchTikhub('GET', endpointWithQuery(options.endpoint, query));

  return successSocialResponse(response.data, usage);
}

export async function runSocialProxyWithFallback(options: SocialFallbackOptions) {
  const auth = await requireUserId(options.request);
  if ('response' in auth) {
    return auth.response;
  }

  const query = resolveQuery(options.query);
  const usage = await deductSocialCredit(auth.userId, options.type, options.amount);
  let lastError: unknown;

  for (const endpoint of options.endpoints) {
    try {
      const response = await fetchTikhub('GET', endpointWithQuery(endpoint, query));
      return successSocialResponse(response.data, usage);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}
