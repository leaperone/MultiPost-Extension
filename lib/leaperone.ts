/**
 * LeaperOne AI Image Generation API Client
 * @description 封装 LeaperOne 图像生成 API 的客户端
 */

const LEAPERONE_API_KEY = process.env.LEAPERONE_API_KEY;
const LEAPERONE_API_BASE_URL = process.env.LEAPERONE_API_BASE_URL || 'https://api.leaper.one/v1';
const LEAPERONE_DEFAULT_MODEL = 'gemini-2.5-flash-image';

interface LeaperOneCreateResponse {
  code: number;
  msg?: string;
  data?: { id?: string } | null;
}

interface LeaperOneGenerationImage {
  id?: string;
  url?: string;
}

interface LeaperOneGenerationData {
  id?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  images?: LeaperOneGenerationImage[] | null;
  error?: string | null;
}

interface LeaperOneGenerationResponse {
  code: number;
  msg?: string;
  data?: LeaperOneGenerationData | null;
}

export interface LeaperOneGenerateParams {
  prompt: string;
  size?: string;
  number?: number;
  referenceImages?: string[];
}

/**
 * 创建图像生成任务
 * @param params - 生成参数
 * @returns 生成任务 ID
 */
export async function createImageGeneration(params: LeaperOneGenerateParams): Promise<string> {
  if (!LEAPERONE_API_KEY) {
    throw new Error('LEAPERONE_API_KEY environment variable is not set');
  }

  const response = await fetch(`${LEAPERONE_API_BASE_URL}/images/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LEAPERONE_API_KEY}`,
      'Content-Type': 'application/json',
      Accept: '*/*',
    },
    body: JSON.stringify({
      prompt: params.prompt,
      model: LEAPERONE_DEFAULT_MODEL,
      number: params.number || 1,
      size: params.size || '1024x1024',
      ...(params.referenceImages?.length && { referenceImages: params.referenceImages }),
    }),
  });

  if (!response.ok) {
    throw new Error(`LeaperOne API HTTP error: ${response.status}`);
  }

  const payload: LeaperOneCreateResponse = await response.json();

  if (payload.code !== 0 || !payload.data?.id) {
    throw new Error(payload.msg || 'Failed to create generation task');
  }

  return payload.data.id;
}

/**
 * 查询生成状态
 * @param generationId - 生成任务 ID
 * @returns 生成状态数据
 */
export async function getGenerationStatus(generationId: string): Promise<LeaperOneGenerationData> {
  if (!LEAPERONE_API_KEY) {
    throw new Error('LEAPERONE_API_KEY environment variable is not set');
  }

  const response = await fetch(`${LEAPERONE_API_BASE_URL}/images/generations/${generationId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${LEAPERONE_API_KEY}`,
      Accept: '*/*',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`LeaperOne API HTTP error: ${response.status}`);
  }

  const payload: LeaperOneGenerationResponse = await response.json();

  if (payload.code !== 0) {
    throw new Error(payload.msg || 'Failed to get generation status');
  }

  return payload.data || {};
}

/**
 * 轮询等待生成完成
 * @param generationId - 生成任务 ID
 * @param options - 轮询选项
 * @returns 生成的图片 URL 数组
 */
export async function waitForCompletion(
  generationId: string,
  options?: { pollInterval?: number; maxWaitTime?: number },
): Promise<string[]> {
  const pollInterval = options?.pollInterval || 5000; // 5秒
  const maxWaitTime = options?.maxWaitTime || 300000; // 5分钟
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    const data = await getGenerationStatus(generationId);

    if (data?.status === 'completed') {
      const urls = data.images?.map((img) => img.url).filter((url): url is string => Boolean(url)) || [];
      if (urls.length === 0) {
        throw new Error('Generation completed but no images returned');
      }
      return urls;
    }

    if (data?.status === 'failed') {
      throw new Error(data.error || 'Generation failed');
    }

    // pending 或 processing，继续等待
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error('Generation timeout');
}

/**
 * 一站式生成图片
 * @param params - 生成参数
 * @returns 生成的图片 URL 数组
 */
export async function generateImage(params: LeaperOneGenerateParams): Promise<string[]> {
  // 1. 创建任务
  const generationId = await createImageGeneration(params);
  console.log('LeaperOne generation task created:', generationId);

  // 2. 轮询等待完成
  const imageUrls = await waitForCompletion(generationId);
  console.log('LeaperOne generated images:', imageUrls);

  return imageUrls;
}

/**
 * 将尺寸格式转换为 LeaperOne 支持的格式
 */
export function convertImageSize(size: string): string {
  const sizeMap: Record<string, string> = {
    auto: '1024x1024',
    '1024x1024': '1024x1024',
    '1080x1080': '1080x1080',
    '1536x1024': '1920x1080', // landscape (old format)
    '1920x1080': '1920x1080', // landscape
    '1024x1536': '1080x1920', // portrait (old format)
    '1080x1920': '1080x1920', // portrait
  };
  return sizeMap[size] || size;
}
