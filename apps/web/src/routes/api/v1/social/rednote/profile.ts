import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { PRICING } from '@/src/actions/credit/types';

import { preflightResponse } from '../../../../../lib/cors';
import { runSocialProxyWithFallback, searchParamsObject, socialErrorResponse } from '../-common';

const requestSchema = z.object({
  user_id: z.string(),
});

const ENDPOINT_V1 = '/v1/xiaohongshu/web/get_user_info';
const ENDPOINT_V2 = '/v1/xiaohongshu/web/get_user_info_v2';
const ENDPOINT_V3 = '/v1/xiaohongshu/web/get_user_info_v3';

export const Route = createFileRoute('/api/v1/social/rednote/profile')({
  server: {
    handlers: {
      OPTIONS: async () => preflightResponse(),
      GET,
    },
  },
});

async function GET({ request }: { request: Request }) {
  try {
    return await runSocialProxyWithFallback({
      request,
      type: 'SOCIAL_MEDIA_REDNOTE',
      amount: PRICING.DEFAULT,
      endpoints: [ENDPOINT_V1, ENDPOINT_V2, ENDPOINT_V3],
      query: () => {
        const searchParams = searchParamsObject(request);
        const params = requestSchema.parse({
          user_id: searchParams.user_id,
        });

        return {
          user_id: params.user_id,
        };
      },
    });
  } catch (error) {
    return socialErrorResponse(error);
  }
}
