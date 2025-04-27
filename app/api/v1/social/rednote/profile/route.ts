import { authKey } from '@/actions/authKey';
import { deductCredit } from '@/actions/credit';
import { PRICING } from '@/actions/credit/types';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { fetchTikhub } from '@/lib/tikhub';
import { successResp, errorResp, unauthResp } from '@/lib/request';

// 请求参数验证 schema
const requestSchema = z.object({
  user_id: z.string(),
});

const ENDPOINT_V1 = '/v1/xiaohongshu/web/get_user_info';
const ENDPOINT_V2 = '/v1/xiaohongshu/web/get_user_info_v2';
const ENDPOINT_V3 = '/v1/xiaohongshu/web/get_user_info_v3';

export async function GET(req: NextRequest) {
  try {
    // 验证授权
    const { userId } = await authKey(req);
    if (!userId) {
      return unauthResp();
    }

    // 获取并验证查询参数
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const params = requestSchema.parse({
      user_id: searchParams.user_id,
    });

    // 扣除积分，使用 PRICING.DEFAULT
    const creditResult = await deductCredit({
      userId,
      type: 'SOCIAL_MEDIA_REDNOTE',
      amount: PRICING.DEFAULT,
    });

    if (!creditResult.success) {
      throw new Error(creditResult.error || 'Insufficient credits');
    }

    // 先尝试 V1
    try {
      const responseV1 = await fetchTikhub('GET', ENDPOINT_V1 + '?' + new URLSearchParams({ user_id: params.user_id }));
      return successResp(responseV1.data);
    } catch (errV1) {
      // V1 失败，尝试 V2
      try {
        const responseV2 = await fetchTikhub(
          'GET',
          ENDPOINT_V2 + '?' + new URLSearchParams({ user_id: params.user_id }),
        );
        return successResp(responseV2.data);
      } catch (errV2) {
        // V2 失败，尝试 V3
        try {
          const responseV3 = await fetchTikhub(
            'GET',
            ENDPOINT_V3 + '?' + new URLSearchParams({ user_id: params.user_id }),
          );
          return successResp(responseV3.data);
        } catch (errV3) {
          // V1/V2/V3 都失败
          return errorResp(errV3);
        }
      }
    }
  } catch (error) {
    return errorResp(error);
  }
}
