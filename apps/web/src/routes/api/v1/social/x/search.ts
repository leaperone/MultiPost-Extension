import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { CREDIT_PER_REQUEST_SOCIAL_MEDIA } from '@/actions/credit/types';

import { preflightResponse } from '../../../../../lib/cors';
import { runSocialProxy, searchParamsObject, socialErrorResponse } from '../-common';

const SearchType = z.enum(['Top', 'Latest', 'Media', 'People', 'Lists']);

const requestSchema = z.object({
  keyword: z.string(),
  search_type: SearchType.default('Top'),
  cursor: z.string().optional(),
});

const ENDPOINT = '/v1/twitter/web/fetch_search_timeline';

export const Route = createFileRoute('/api/v1/social/x/search')({
  server: {
    handlers: {
      OPTIONS: async () => preflightResponse(),
      GET,
    },
  },
});

async function GET({ request }: { request: Request }) {
  try {
    return await runSocialProxy({
      request,
      type: 'SOCIAL_MEDIA_X',
      amount: CREDIT_PER_REQUEST_SOCIAL_MEDIA.X,
      endpoint: ENDPOINT,
      query: () => {
        const searchParams = searchParamsObject(request);
        const params = requestSchema.parse({
          keyword: searchParams.keyword,
          search_type: searchParams.search_type || 'Top',
          cursor: searchParams.cursor,
        });

        return {
          keyword: params.keyword,
          search_type: params.search_type,
          ...(params.cursor && { cursor: params.cursor }),
        };
      },
    });
  } catch (error) {
    return socialErrorResponse(error);
  }
}
