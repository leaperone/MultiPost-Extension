import { deductCredit } from '@/actions/credit';
import { PRICING } from '@/actions/credit/types';
import { authInternalRequest } from '@/app/api/internal/auth';
import { errorResponse, successResponse, unauthenticatedResponse } from '@/lib/response';
import Decimal from 'decimal.js';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { success, userId } = await authInternalRequest(request);
    if (!success || !userId) {
      return unauthenticatedResponse();
    }

    const data = await request.json();

    const durationSeconds = Number(data.duration);

    const result = await deductCredit({
      userId,
      type: 'AUDIO_TRANSCRIPTION',
      amount: new Decimal(PRICING.AUDIO_TRANSCRIPTION.mul(durationSeconds)),
    });

    if (!result.success) {
      return errorResponse('Insufficient credits');
    }

    return successResponse(data, result.usage);
  } catch (error) {
    return errorResponse(error);
  }
}
