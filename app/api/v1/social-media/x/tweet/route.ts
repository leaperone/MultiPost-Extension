import { authKey } from '@/actions/authKey';
import { deductCredit } from '@/actions/credit';
import { CREDIT_PER_REQUEST_SOCIAL_MEDIA } from '@/actions/credit/types';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchTikhub } from '@/app/api/v1/social-media/tikhub';

// 请求参数验证 schema
const requestSchema = z.object({
  tweet_id: z.number(),
});

const ENDPOINT = '/v1/twitter/web/fetch_tweet_detail';

export async function GET(req: NextRequest) {
  try {
    // 验证授权
    const { success, userId, error } = await authKey(req);
    if (!success || !userId) {
      throw new Error(error);
    }

    // 获取并验证查询参数
    // 获取并验证查询参数
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const params = requestSchema.parse({
      tweet_id: searchParams.tweet_id ? parseInt(searchParams.tweet_id) : undefined,
    });

    // 扣除积分
    const creditResult = await deductCredit({
      userId,
      type: 'SOCIAL_MEDIA_X',
      amount: CREDIT_PER_REQUEST_SOCIAL_MEDIA.X,
    });

    if (!creditResult.success) {
      throw new Error(creditResult.error || 'Insufficient credits');
    }

    // 调用 TikHub API
    const response = await fetchTikhub(
      'GET',
      ENDPOINT + '?' + new URLSearchParams({ tweet_id: params.tweet_id.toString() }),
    );

    return NextResponse.json({
      success: true,
      data: response.data,
      meta: creditResult.usage,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
