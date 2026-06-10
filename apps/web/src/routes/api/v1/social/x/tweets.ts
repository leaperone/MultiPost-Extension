import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { CREDIT_PER_REQUEST_SOCIAL_MEDIA } from '@/src/actions/credit/types';

import { preflightResponse } from '../../../../../lib/cors';
import { runSocialProxy, searchParamsObject, socialErrorResponse } from '../-common';

const requestSchema = z
  .object({
    screen_name: z.string().optional(),
    rest_id: z.string().regex(/^\d+$/).optional(),
    cursor: z.string().optional(),
  })
  .refine((data) => data.screen_name || data.rest_id, {
    message: 'Either screen_name or rest_id must be provided',
  });

const ENDPOINT = '/v1/twitter/web/fetch_user_post_tweet';

export const Route = createFileRoute('/api/v1/social/x/tweets')({
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
          screen_name: searchParams.screen_name,
          rest_id: searchParams.rest_id,
          cursor: searchParams.cursor,
        });

        return {
          ...(params.screen_name && { screen_name: params.screen_name }),
          ...(params.rest_id && { rest_id: params.rest_id }),
          ...(params.cursor && { cursor: params.cursor }),
        };
      },
    });
  } catch (error) {
    return socialErrorResponse(error);
  }
}
