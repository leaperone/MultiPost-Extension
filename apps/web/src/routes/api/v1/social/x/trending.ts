import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { CREDIT_PER_REQUEST_SOCIAL_MEDIA } from '@/actions/credit/types';

import { preflightResponse } from '../../../../../lib/cors';
import { runSocialProxy, searchParamsObject, socialErrorResponse } from '../-common';

const SUPPORTED_COUNTRIES = [
  'UnitedStates',
  'China',
  'India',
  'Japan',
  'Russia',
  'Germany',
  'Indonesia',
  'Brazil',
  'France',
  'UnitedKingdom',
  'Turkey',
  'Italy',
  'Mexico',
  'SouthKorea',
  'Canada',
  'Spain',
  'SaudiArabia',
  'Egypt',
  'Australia',
  'Poland',
  'Iran',
  'Pakistan',
  'Vietnam',
  'Nigeria',
  'Bangladesh',
  'Netherlands',
  'Argentina',
  'Philippines',
  'Malaysia',
  'Colombia',
  'UniteArabEmirates',
  'Romania',
  'Belgium',
  'Switzerland',
  'Singapore',
  'Sweden',
  'Norway',
  'Austria',
  'Kazakhstan',
  'Algeria',
  'Chile',
  'Czechia',
  'Peru',
  'Iraq',
  'Israel',
  'Ukraine',
  'Denmark',
  'Portugal',
  'Hungary',
  'Greece',
  'Finland',
  'NewZealand',
  'Belarus',
  'Slovakia',
  'Serbia',
  'Lithuania',
  'Luxembourg',
  'Estonia',
] as const;

const requestSchema = z.object({
  country: z.enum(SUPPORTED_COUNTRIES).default('UnitedStates'),
});

const ENDPOINT = '/v1/twitter/web/fetch_trending';

export const Route = createFileRoute('/api/v1/social/x/trending')({
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
          country: searchParams.country || 'UnitedStates',
        });

        return {
          country: params.country,
        };
      },
    });
  } catch (error) {
    return socialErrorResponse(error);
  }
}
