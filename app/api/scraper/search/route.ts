import { authKey } from '@/actions/authKey';
import { deductCredit } from '@/actions/credit';
import { CREDIT_PER_TOEKN } from '@/actions/credit/types';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const JINA_API_KEY = process.env.JINA_API_KEY;
const JINA_API_URL = 'https://s.jina.ai/';

interface SearchResult {
  title: string;
  description: string;
  url: string;
  content: string;
  favicon?: string;
  usage?: {
    tokens: number;
  };
}

// 请求体验证 schema
const requestSchema = z.object({
  q: z.string(),
  gl: z.string().optional(),
  location: z.string().optional(),
  hl: z.string().optional(),
  num: z.number().optional(),
  page: z.number().optional(),
  site: z.string().url().optional(),
  withLinksSummary: z.enum(['all', 'true']).optional(),
  withImagesSummary: z.enum(['all', 'true']).optional(),
  retainImages: z.literal('none').optional(),
  noCache: z.boolean().default(true),
  withGeneratedAlt: z.boolean().optional(),
  respondWith: z.literal('no-content').optional(),
  withFavicon: z.boolean().default(true),
  returnFormat: z.enum(['markdown', 'html', 'text', 'screenshot', 'pageshot']).optional(),
  engine: z.enum(['browser', 'direct']).optional(),
  withFavicons: z.boolean().optional(),
  timeout: z.number().optional(),
  cookies: z.string().optional(),
  proxyUrl: z.string().url().optional(),
  locale: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // 验证认证
    const { success, userId, error } = await authKey(req);
    if (!success || !userId) {
      return NextResponse.json({
        success: false,
        error,
      });
    }

    // 解析请求体
    const body = await req.json();
    const validatedData = requestSchema.parse(body);

    // 构建请求头
    const headers: HeadersInit = {
      Authorization: `Bearer ${JINA_API_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-No-Cache': 'true',
      'X-With-Favicons': 'true',
    };

    // 添加可选请求头
    if (validatedData.site) {
      headers['X-Site'] = validatedData.site;
    }
    if (validatedData.withLinksSummary) {
      headers['X-With-Links-Summary'] = validatedData.withLinksSummary;
    }
    if (validatedData.withImagesSummary) {
      headers['X-With-Images-Summary'] = validatedData.withImagesSummary;
    }
    if (validatedData.retainImages) {
      headers['X-Retain-Images'] = validatedData.retainImages;
    }
    if (validatedData.withGeneratedAlt) {
      headers['X-With-Generated-Alt'] = 'true';
    }
    if (validatedData.respondWith) {
      headers['X-Respond-With'] = validatedData.respondWith;
    }
    if (validatedData.withFavicon) {
      headers['X-With-Favicon'] = 'true';
    }
    if (validatedData.returnFormat) {
      headers['X-Return-Format'] = validatedData.returnFormat;
    }
    if (validatedData.engine) {
      headers['X-Engine'] = validatedData.engine;
    }
    if (validatedData.timeout) {
      headers['X-Timeout'] = validatedData.timeout.toString();
    }
    if (validatedData.cookies) {
      headers['X-Set-Cookie'] = validatedData.cookies;
    }
    if (validatedData.proxyUrl) {
      headers['X-Proxy-Url'] = validatedData.proxyUrl;
    }
    if (validatedData.locale) {
      headers['X-Locale'] = validatedData.locale;
    }

    if (validatedData.withFavicons === false) {
      delete headers['X-With-Favicons'];
    }

    // 构建请求体
    const requestBody = {
      q: validatedData.q,
      ...(validatedData.gl && { gl: validatedData.gl }),
      ...(validatedData.location && { location: validatedData.location }),
      ...(validatedData.hl && { hl: validatedData.hl }),
      ...(validatedData.num && { num: validatedData.num }),
      ...(validatedData.page && { page: validatedData.page }),
    };

    // 调用 Jina Search API
    const response = await fetch(JINA_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Internal server error`);
    }

    const responseData = await response.json();

    if (responseData.code !== 200) {
      throw new Error(responseData.readableMessage || 'Search API error');
    }

    // 计算并扣除积分
    const totalTokens = (responseData.data as SearchResult[]).reduce((acc: number, item) => {
      return acc + (item.usage?.tokens || 0);
    }, 0);

    const credit = CREDIT_PER_TOEKN.SEARCH_API.mul(totalTokens);

    const result = await deductCredit({
      userId,
      type: 'SEARCH_API',
      amount: credit,
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    // 移除 usage 信息
    delete responseData.data.usage;

    return NextResponse.json({
      success: true,
      data: responseData.data,
      meta: result.usage,
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
