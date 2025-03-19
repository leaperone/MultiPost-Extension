/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';

// Schema 定义
export const anyObjectParam = z.record(z.any());
export const urlOrPathParam = z.string().max(500);

export const schema = z.object({
  type: z.enum(['event', 'identify']),
  payload: z.object({
    website: z.string(),
    data: anyObjectParam.optional(),
    hostname: z.string().max(100).optional(),
    language: z.string().max(35).optional(),
    referrer: urlOrPathParam.optional(),
    screen: z.string().max(11).optional(),
    title: z.string().optional(),
    url: urlOrPathParam.optional(),
    name: z.string().max(50).optional(),
    tag: z.string().max(50).optional(),
    ip: z.string().ip().optional(),
    userAgent: z.string().optional(),
    timestamp: z.coerce.number().int().optional(),
  }),
});

// 常量
export const COLLECTION_TYPE = {
  event: 'event',
  identify: 'identify',
} as const;

export function safeDecodeURI(s: string | undefined | null): string | undefined | null {
  if (s === undefined || s === null) {
    return s;
  }

  try {
    return decodeURI(s);
  } catch (e) {
    return s;
  }
}

export function safeDecodeURIComponent(s: string | undefined | null): string | undefined | null {
  if (s === undefined || s === null) {
    return s;
  }

  try {
    return decodeURIComponent(s);
  } catch (e) {
    return s;
  }
}

