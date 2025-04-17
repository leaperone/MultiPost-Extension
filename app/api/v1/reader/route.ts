import { authKey } from '@/actions/authKey';
import { deductCredit, preCheckCredit } from '@/actions/credit';
import { CREDIT_PER_TOEKN } from '@/actions/credit/types';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const JINA_API_KEY = process.env.JINA_API_KEY;
const JINA_API_URL = 'https://r.jina.ai/';

// 请求体验证 schema
const requestSchema = z.object({
  url: z.string().url(),
  viewport: z
    .object({
      width: z.number(),
      height: z.number(),
    })
    .optional(),
  injectPageScript: z.string().optional(),
  targetSelector: z.union([z.string(), z.array(z.string())]).optional(),
  removeSelector: z.union([z.string(), z.array(z.string())]).optional(),
  timeout: z.number().optional(), // 单位：秒
  waitForSelector: z.union([z.string(), z.array(z.string())]).optional(),
  withLinks: z.boolean().optional().default(true),
  withImages: z.boolean().optional().default(true),
  withGeneratedAlt: z.boolean().optional().default(true),
  withIframe: z.boolean().optional(),
  returnFormat: z.enum(['markdown', 'html', 'text', 'screenshot', 'pageshot']).default('markdown'),
  noCache: z.boolean().default(true),
  cookies: z
    .union([
      z.string(),
      z.array(
        z.object({
          name: z.string(),
          value: z.string(),
          domain: z.string().optional(),
        }),
      ),
    ])
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    // 解析请求体
    const { success, userId, error } = await authKey(req);
    if (!success || !userId) {
      return NextResponse.json({
        success: false,
        error,
      });
    }

    if (!(await preCheckCredit(userId, Number(0.1)))) {
      return NextResponse.json({
        success: false,
        error: 'Precheck failed, please top up over 0.1 credits',
      });
    }

    const body = await req.json();
    const validatedData = requestSchema.parse(body);

    // 构建请求头
    const headers: HeadersInit = {
      Authorization: `Bearer ${JINA_API_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-With-Links-Summary': 'true',
      'X-With-Images-Summary': 'true',
      'X-With-Generated-Alt': 'true',
      'X-No-Cache': 'true',
    };

    // 添加可选请求头
    if (validatedData.targetSelector) {
      headers['X-Target-Selector'] = Array.isArray(validatedData.targetSelector)
        ? validatedData.targetSelector.join(',')
        : validatedData.targetSelector;
    }
    if (validatedData.removeSelector) {
      headers['X-Remove-Selector'] = Array.isArray(validatedData.removeSelector)
        ? validatedData.removeSelector.join(',')
        : validatedData.removeSelector;
    }
    if (validatedData.timeout) {
      headers['X-Timeout'] = validatedData.timeout.toString();
    }
    if (validatedData.waitForSelector) {
      headers['X-Wait-For-Selector'] = Array.isArray(validatedData.waitForSelector)
        ? validatedData.waitForSelector.join(',')
        : validatedData.waitForSelector;
    }
    if (validatedData.cookies) {
      if (typeof validatedData.cookies === 'string') {
        headers['X-Set-Cookie'] = validatedData.cookies;
      } else {
        headers['X-Set-Cookie'] = validatedData.cookies
          .map((cookie) => {
            const cookieStr = `${cookie.name}=${cookie.value}`;
            return cookie.domain ? `${cookieStr}; domain=${cookie.domain}` : cookieStr;
          })
          .join(', ');
      }
    }
    if (validatedData.withIframe) {
      headers['X-With-Iframe'] = 'true';
    }
    if (validatedData.returnFormat) {
      headers['X-Return-Format'] = validatedData.returnFormat;
    }

    // 如果明确设置为 false，则移除对应的请求头
    if (validatedData.withLinks === false) {
      delete headers['X-With-Links-Summary'];
    }
    if (validatedData.withImages === false) {
      delete headers['X-With-Images-Summary'];
    }
    if (validatedData.withGeneratedAlt === false) {
      delete headers['X-With-Generated-Alt'];
    }
    if (validatedData.noCache === false) {
      delete headers['X-No-Cache'];
    }

    // 构建请求体
    const requestBody = {
      url: validatedData.url,
      ...(validatedData.viewport && { viewport: validatedData.viewport }),
      ...(validatedData.injectPageScript && { injectPageScript: validatedData.injectPageScript }),
    };

    // 调用 Jina Reader API
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
      throw new Error(responseData.readableMessage);
    }

    const data = responseData.data;

    const credit = CREDIT_PER_TOEKN.WEB_READER_API.mul(data.usage.tokens);

    const result = await deductCredit({
      userId,
      type: 'WEB_READER_API',
      amount: credit,
    });

    delete responseData.data.usage;

    if (!result.success) {
      throw new Error(result.error);
    }

    return NextResponse.json({ success: true, data: responseData.data, meta: result.usage });
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
