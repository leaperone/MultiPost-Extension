import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { CREDIT_PER_REQUEST_SOCIAL_MEDIA } from '@/src/actions/credit/types';

import { preflightResponse } from '../../../../../lib/cors';
import { runSocialProxy, searchParamsObject, socialErrorResponse } from '../-common';

const requestSchema = z.object({
  tweet_id: z.string().regex(/^\d+$/),
});

const ENDPOINT = '/v1/twitter/web/fetch_tweet_detail';

export const Route = createFileRoute('/api/v1/social/x/tweet')({
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
          tweet_id: searchParams.tweet_id,
        });

        return {
          tweet_id: params.tweet_id,
        };
      },
    });
  } catch (error) {
    return socialErrorResponse(error);
  }
}
