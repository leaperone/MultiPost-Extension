import { deductCredit } from '@/actions/credit';
import { PRICING } from '@/actions/credit/types';
import { authInternalRequest } from '@/app/api/internal/auth';
import { errorResponse, successResponse, unauthenticatedResponse } from '@/lib/response';
import Decimal from 'decimal.js';
import { NextRequest } from 'next/server';
import { z } from 'zod';

/**
 * 音频转录请求数据验证 schema
 */
const AudioTranscriptionSchema = z.object({
  duration: z.number().positive('Duration must be a positive number'),
});

export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const { success, userId } = await authInternalRequest(request);
    if (!success || !userId) {
      return unauthenticatedResponse();
    }

    // 解析请求数据
    const rawData = await request.json();

    // 验证请求数据格式
    const validationResult = AudioTranscriptionSchema.safeParse(rawData);
    if (!validationResult.success) {
      throw new Error(`Invalid request data: ${validationResult.error.issues[0].message}`);
    }

    const { duration } = validationResult.data;
    const durationSeconds = Number(duration);

    // 计算所需的信用点数
    const creditAmount = new Decimal(PRICING.AUDIO_TRANSCRIPTION.mul(durationSeconds));

    // 扣减信用点数
    const result = await deductCredit({
      userId,
      type: 'AUDIO_TRANSCRIPTION',
      amount: creditAmount,
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to deduct credits');
    }

    return successResponse(rawData, result.usage);
  } catch (error) {
    return errorResponse(error);
  }
}
