import { z } from 'zod';

const JINA_API_KEY = process.env.JINA_API_KEY;
const JINA_API_URL = 'https://r.jina.ai/';

// 请求体验证 schema
export const requestSchema = z.object({
  url: z.string().url(),
  prompt: z.string().optional(),
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

export interface JinaRequestOptions {
  url: string;
  prompt?: string;
  viewport?: { width: number; height: number };
  injectPageScript?: string;
  targetSelector?: string | string[];
  removeSelector?: string | string[];
  timeout?: number;
  waitForSelector?: string | string[];
  withLinks?: boolean;
  withImages?: boolean;
  withGeneratedAlt?: boolean;
  withIframe?: boolean;
  returnFormat?: 'markdown' | 'html' | 'text' | 'screenshot' | 'pageshot';
  noCache?: boolean;
  cookies?: string | Array<{ name: string; value: string; domain?: string }>;
}

/**
 * 调用 Jina Reader API 获取网页内容
 * @param options 请求选项
 * @returns Jina Reader API 响应数据
 */
export async function fetchJinaReader(options: JinaRequestOptions) {
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
  if (options.targetSelector) {
    headers['X-Target-Selector'] = Array.isArray(options.targetSelector)
      ? options.targetSelector.join(',')
      : options.targetSelector;
  }
  if (options.removeSelector) {
    headers['X-Remove-Selector'] = Array.isArray(options.removeSelector)
      ? options.removeSelector.join(',')
      : options.removeSelector;
  }
  if (options.timeout) {
    headers['X-Timeout'] = options.timeout.toString();
  }
  if (options.waitForSelector) {
    headers['X-Wait-For-Selector'] = Array.isArray(options.waitForSelector)
      ? options.waitForSelector.join(',')
      : options.waitForSelector;
  }
  if (options.cookies) {
    if (typeof options.cookies === 'string') {
      headers['X-Set-Cookie'] = options.cookies;
    } else {
      headers['X-Set-Cookie'] = options.cookies
        .map((cookie) => {
          const cookieStr = `${cookie.name}=${cookie.value}`;
          return cookie.domain ? `${cookieStr}; domain=${cookie.domain}` : cookieStr;
        })
        .join(', ');
    }
  }
  if (options.withIframe) {
    headers['X-With-Iframe'] = 'true';
  }
  if (options.returnFormat) {
    headers['X-Return-Format'] = options.returnFormat;
  }

  // 如果明确设置为 false，则移除对应的请求头
  if (options.withLinks === false) {
    delete headers['X-With-Links-Summary'];
  }
  if (options.withImages === false) {
    delete headers['X-With-Images-Summary'];
  }
  if (options.withGeneratedAlt === false) {
    delete headers['X-With-Generated-Alt'];
  }
  if (options.noCache === false) {
    delete headers['X-No-Cache'];
  }

  // 构建请求体
  const requestBody = {
    url: options.url,
    ...(options.viewport && { viewport: options.viewport }),
    ...(options.injectPageScript && { injectPageScript: options.injectPageScript }),
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

  return responseData;
}
