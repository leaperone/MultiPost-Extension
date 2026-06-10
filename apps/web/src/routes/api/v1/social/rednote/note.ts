import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { PRICING } from '@/src/actions/credit/types';

import { preflightResponse } from '../../../../../lib/cors';
import { runSocialProxyWithFallback, searchParamsObject, socialErrorResponse } from '../-common';

const requestSchema = z
  .object({
    note_id: z.string().optional(),
    share_text: z.string().optional(),
  })
  .refine((data) => data.note_id || data.share_text, {
    message: 'Either note_id or share_text must be provided',
  });

const ENDPOINT_V1 = '/v1/xiaohongshu/web/get_note_info';
const ENDPOINT_V2 = '/v1/xiaohongshu/web/get_note_info_v2';
const ENDPOINT_V4 = '/v1/xiaohongshu/web/get_note_info_v4';

export const Route = createFileRoute('/api/v1/social/rednote/note')({
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
      endpoints: [ENDPOINT_V1, ENDPOINT_V2, ENDPOINT_V4],
      query: () => {
        const searchParams = searchParamsObject(request);
        const params = requestSchema.parse({
          note_id: searchParams.note_id,
          share_text: searchParams.share_text,
        });

        const query: Record<string, string> = {};
        if (params.note_id) {
          query.note_id = params.note_id;
        } else if (params.share_text) {
          query.share_text = params.share_text;
        }

        return query;
      },
    });
  } catch (error) {
    return socialErrorResponse(error);
  }
}
