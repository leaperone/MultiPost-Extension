import { authKey } from '@/actions/authKey';
import { deductCredit, preCheckCredit } from '@/actions/credit';
import { PRICING } from '@/actions/credit/types';
import { NextRequest } from 'next/server';
import { unauthenticatedResponse, successResponse, errorResponse } from '@/lib/response';
import { fetchJinaReader, requestSchema } from './lib';

export async function POST(req: NextRequest) {
  try {
    // 解析请求体
    const { userId } = await authKey(req);
    if (!userId) {
      return unauthenticatedResponse();
    }

    // 检查用户余额
    if (!(await preCheckCredit(userId))) {
      throw new Error('Precheck failed, please top up over 0.1 credits');
    }

    const body = await req.json();
    const validatedData = requestSchema.parse(body);

    // 调用封装的函数获取 Jina Reader 数据
    const responseData = await fetchJinaReader(validatedData);
    const data = responseData.data; // 获取 Jina Reader 数据

    // TODO: 把 Jina Reader 数据，给到 LLM 处理数据

    const credit = PRICING.WEB_READER_API.mul(data.usage.tokens);

    const result = await deductCredit({
      userId,
      type: 'WEB_READER_API',
      amount: credit,
    });

    delete responseData.data.usage;

    if (!result.success) {
      throw new Error(result.error);
    }

    return successResponse(responseData.data, result.usage);
  } catch (error) {
    return errorResponse(error);
  }
}
