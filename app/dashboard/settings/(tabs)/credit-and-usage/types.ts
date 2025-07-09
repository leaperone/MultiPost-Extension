// 使用类型客户端安全版本
export const USAGE_TYPE_MAP = {
  WEB_READER_API: 'Web Reader API', // Deprecated
  WEB_SEARCH_API: 'Web Search API', // Deprecated
  SOCIAL_MEDIA_X: 'Social Media X',
} as const;

export type UsageType = keyof typeof USAGE_TYPE_MAP;

export function getUsageType(type: string): string {
  return USAGE_TYPE_MAP[type as UsageType] || type;
}
