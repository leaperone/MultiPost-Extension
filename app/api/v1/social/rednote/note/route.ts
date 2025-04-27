import { authKey } from '@/actions/authKey';
import { deductCredit } from '@/actions/credit';
import { PRICING } from '@/actions/credit/types';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { fetchTikhub } from '@/lib/tikhub';
import { successResp, errorResp, unauthResp } from '@/lib/request';

// 请求参数验证 schema
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

export async function GET(req: NextRequest) {
  try {
    // 鉴权
    const { userId } = await authKey(req);
    if (!userId) {
      return unauthResp();
    }

    // 获取并验证查询参数
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const params = requestSchema.parse({
      note_id: searchParams.note_id,
      share_text: searchParams.share_text,
    });

    // 优先 note_id
    const query: Record<string, string> = {};
    if (params.note_id) {
      query.note_id = params.note_id;
    } else if (params.share_text) {
      query.share_text = params.share_text;
    }

    // 扣除积分，使用 PRICING.DEFAULT
    const creditResult = await deductCredit({
      userId,
      type: 'SOCIAL_MEDIA_REDNOTE',
      amount: PRICING.DEFAULT,
    });
    if (!creditResult.success) {
      throw new Error(creditResult.error || 'Insufficient credits');
    }

    // 优先 V1，失败用 V2，V2 失败用 V4
    try {
      const responseV1 = await fetchTikhub('GET', ENDPOINT_V1 + '?' + new URLSearchParams(query));
      return successResp(responseV1.data);
    } catch (errV1) {
      try {
        const responseV2 = await fetchTikhub('GET', ENDPOINT_V2 + '?' + new URLSearchParams(query));
        return successResp(responseV2.data);
      } catch (errV2) {
        try {
          const responseV4 = await fetchTikhub('GET', ENDPOINT_V4 + '?' + new URLSearchParams(query));
          return successResp(responseV4.data);
        } catch (errV4) {
          return errorResp(errV4);
        }
      }
    }
  } catch (error) {
    return errorResp(error);
  }
}
