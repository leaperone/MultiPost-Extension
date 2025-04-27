import { authKey } from '@/actions/authKey';
import { deductCredit } from '@/actions/credit';
import { CREDIT_PER_REQUEST_SOCIAL_MEDIA } from '@/actions/credit/types';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { fetchTikhub } from '@/lib/tikhub';
import { unauthenticatedResponse, successResponse, errorResponse } from '@/lib/response';

// 搜索类型枚举
const SearchType = z.enum(['Top', 'Latest', 'Media', 'People', 'Lists']);

// 请求参数验证 schema
const requestSchema = z.object({
  keyword: z.string(),
  search_type: SearchType.default('Top'),
  cursor: z.string().optional(),
});

const ENDPOINT = '/v1/twitter/web/fetch_search_timeline';

export async function GET(req: NextRequest) {
  try {
    // 验证授权
    const { userId } = await authKey(req);
    if (!userId) {
      return unauthenticatedResponse();
    }

    // 获取并验证查询参数
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const params = requestSchema.parse({
      keyword: searchParams.keyword,
      search_type: searchParams.search_type || 'Top',
      cursor: searchParams.cursor,
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

    // 构建查询参数
    const queryParams = new URLSearchParams({
      keyword: params.keyword,
      search_type: params.search_type,
    });
    if (params.cursor) {
      queryParams.append('cursor', params.cursor);
    }

    // 调用 TikHub API
    const response = await fetchTikhub('GET', ENDPOINT + '?' + queryParams.toString());

    return successResponse(response.data, creditResult.usage);
  } catch (error) {
    return errorResponse(error);
  }
}
