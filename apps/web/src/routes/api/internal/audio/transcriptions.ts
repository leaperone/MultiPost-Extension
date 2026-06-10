import { createFileRoute } from '@tanstack/react-router';
import { Decimal } from '@prisma/client/runtime/library';
import { z } from 'zod';

import { PRICING } from '@/src/actions/credit/types';

import { preflightResponse, withCors } from '../../../../lib/cors';
import { authInternalRequest } from '../../../../lib/internalAuth';
import { errorResponse, successResponse, unauthenticatedResponse } from '../../../../lib/response';

/**
 * Audio transcription request data validation schema.
 */
const AudioTranscriptionSchema = z.object({
  duration: z.number().positive('Duration must be a positive number'),
});

export const Route = createFileRoute('/api/internal/audio/transcriptions')({
  server: {
    handlers: {
      OPTIONS: async () => preflightResponse(),
      POST,
    },
  },
});

async function POST({ request }: { request: Request }) {
  try {
    // Validate user identity.
    const { success, userId } = await authInternalRequest(request);
    if (!success || !userId) {
      return withCors(unauthenticatedResponse());
    }

    // Parse request data.
    const rawData = await request.json();

    // Validate request data format.
    const validationResult = AudioTranscriptionSchema.safeParse(rawData);
    if (!validationResult.success) {
      throw new Error(`Invalid request data: ${validationResult.error.issues[0].message}`);
    }

    const { duration } = validationResult.data;
    const durationSeconds = Number(duration);

    // Calculate required credits.
    const creditAmount = new Decimal(PRICING.AUDIO_TRANSCRIPTION.mul(durationSeconds));

    // Deduct credits.
    const { deductCredit } = await import('../../../../actions/credit/_core');
    const result = await deductCredit({
      userId,
      type: 'AUDIO_TRANSCRIPTION',
      amount: creditAmount,
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to deduct credits');
    }

    return withCors(successResponse(rawData, result.usage));
  } catch (error) {
    return withCors(errorResponse(error));
  }
}
