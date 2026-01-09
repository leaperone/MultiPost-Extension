import { auth } from '@/auth';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { fetchTikhub } from '@/lib/tikhub';
import { successResp, errorResp, unauthResp } from '@/lib/request';

const requestSchema = z.object({
  url: z.string().min(1, 'Video URL is required'),
});

// Platform-specific endpoints (more reliable)
const PLATFORM_ENDPOINTS: Record<string, { endpoint: string; paramName: string }> = {
  douyin: { endpoint: '/v1/douyin/app/v3/fetch_one_video_by_share_url', paramName: 'share_url' },
  tiktok: { endpoint: '/v1/tiktok/app/v3/fetch_one_video_by_share_url', paramName: 'share_url' },
};

// Response structure from TikHub API
interface HybridVideoData {
  // Common fields
  aweme_id?: string;
  id?: string;
  video_id?: string;
  desc?: string;
  title?: string;
  caption?: string;
  duration?: number;
  platform?: string;

  // Video URLs
  video?: {
    play_addr?: { url_list?: string[] };
    download_addr?: { url_list?: string[] };
    cover?: { url_list?: string[] };
    duration?: number;
  };
  video_url?: string;
  download_url?: string;
  play_url?: string;

  // Audio/Music
  music?: {
    play_url?: { uri?: string; url_list?: string[] };
    duration?: number;
  };

  // Cover image
  cover?: { url_list?: string[] };
  cover_url?: string;
  thumbnail?: string;

  // Author info
  author?: {
    uid?: string;
    id?: string;
    nickname?: string;
    unique_id?: string;
    sec_uid?: string;
    username?: string;
  };
  user?: {
    uid?: string;
    id?: string;
    nickname?: string;
    unique_id?: string;
    sec_uid?: string;
    username?: string;
  };
}

interface TikHubHybridResponse {
  code: number;
  data: {
    aweme_detail?: HybridVideoData;
    aweme_details?: HybridVideoData[];
    data?: HybridVideoData;
  } & HybridVideoData;
}

interface VideoExtractResult {
  videoId: string;
  platform: string;
  title: string;
  author: string;
  authorId: string;
  audioUrl: string;
  videoUrl: string;
  coverUrl: string;
  duration: number;
}

/**
 * Detect platform from URL (only Douyin and TikTok are supported)
 */
function detectPlatform(videoUrl: string): string {
  const platformPatterns: Record<string, RegExp[]> = {
    douyin: [/douyin\.com/, /iesdouyin\.com/],
    tiktok: [/tiktok\.com/],
  };

  const lowerUrl = videoUrl.toLowerCase();
  for (const [platform, patterns] of Object.entries(platformPatterns)) {
    if (patterns.some((pattern) => pattern.test(lowerUrl))) {
      return platform;
    }
  }
  return 'unknown';
}

/**
 * Extract video download URL from hybrid response
 */
function extractVideoUrl(data: HybridVideoData | undefined): string {
  if (!data) return '';

  // Try multiple possible URL locations
  // 1. Direct URL fields
  if (data.download_url) return data.download_url;
  if (data.video_url) return data.video_url;
  if (data.play_url) return data.play_url;

  // 2. Nested video object (Douyin/TikTok format)
  const downloadUrls = data.video?.download_addr?.url_list;
  if (downloadUrls && downloadUrls.length > 0) {
    return downloadUrls[0];
  }
  const playUrls = data.video?.play_addr?.url_list;
  if (playUrls && playUrls.length > 0) {
    return playUrls[0];
  }

  return '';
}

/**
 * Extract cover image URL from hybrid response
 */
function extractCoverUrl(data: HybridVideoData | undefined): string {
  if (!data) return '';

  // Direct cover URL
  if (data.cover_url) return data.cover_url;
  if (data.thumbnail) return data.thumbnail;

  // Nested cover object
  if (data.cover?.url_list?.[0]) return data.cover.url_list[0];
  if (data.video?.cover?.url_list?.[0]) return data.video.cover.url_list[0];

  return '';
}

/**
 * Extract author info from hybrid response
 */
function extractAuthor(data: HybridVideoData | undefined): { name: string; id: string } {
  if (!data) return { name: '', id: '' };

  const author = data.author || data.user;
  if (author) {
    return {
      name: author.nickname || author.username || '',
      id: author.sec_uid || author.uid || author.id || author.unique_id || '',
    };
  }

  return { name: '', id: '' };
}

/**
 * Extract title/description from hybrid response
 */
function extractTitle(data: HybridVideoData | undefined): string {
  if (!data) return '';
  return data.desc || data.title || data.caption || '';
}

/**
 * Extract video ID from hybrid response
 */
function extractVideoId(data: HybridVideoData | undefined): string {
  if (!data) return '';
  return data.aweme_id || data.id || data.video_id || '';
}

export async function GET(req: NextRequest) {
  try {
    // 验证用户登录
    const session = await auth();
    if (!session?.user?.id) {
      return unauthResp();
    }

    // 获取并验证查询参数
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const params = requestSchema.parse({ url: searchParams.url });

    // 检测平台并选择对应的 API 端点
    const detectedPlatform = detectPlatform(params.url);
    const platformConfig = PLATFORM_ENDPOINTS[detectedPlatform];

    console.log(`[Video Extract] URL: ${params.url}`);
    console.log(`[Video Extract] Detected platform: ${detectedPlatform}`);

    // 只支持抖音和 TikTok
    if (!platformConfig) {
      throw new Error('目前仅支持抖音和 TikTok 视频链接');
    }

    // 使用平台特定的端点
    const query = new URLSearchParams({
      [platformConfig.paramName]: params.url,
    });
    console.log(`[Video Extract] Using platform endpoint: ${platformConfig.endpoint}`);
    const response = (await fetchTikhub('GET', `${platformConfig.endpoint}?${query}`)) as TikHubHybridResponse;

    // 解析响应数据 - 支持多种嵌套格式
    // 抖音 v3 API 返回 aweme_details (数组)，其他可能返回 aweme_detail (单个) 或 data
    const awemeDetails = response.data?.aweme_details;
    const videoData = awemeDetails?.[0] || response.data?.aweme_detail || response.data?.data || response.data;

    // 检查视频是否被过滤（删除、私密等）
    const filterList = (response.data as { filter_list?: { reason: number }[] })?.filter_list;
    if (filterList && filterList.length > 0 && !awemeDetails?.length) {
      console.error('[Video Extract] Video filtered:', JSON.stringify(filterList));
      throw new Error('视频不可用，可能已被删除、设为私密或有访问限制');
    }

    const videoDownloadUrl = extractVideoUrl(videoData);

    if (!videoDownloadUrl) {
      console.error('[Video Extract] No video URL found in response:', JSON.stringify(response.data).substring(0, 500));
      throw new Error('无法获取视频下载链接，请检查链接是否有效或该平台是否支持');
    }

    // 提取时长 - 可能在多个位置，单位可能是毫秒或秒
    let duration = videoData?.duration || videoData?.video?.duration || videoData?.music?.duration || 0;
    // 如果时长大于 10000，认为是毫秒，需要转换为秒
    if (duration > 10000) {
      duration = Math.floor(duration / 1000);
    }

    const author = extractAuthor(videoData);

    const result: VideoExtractResult = {
      videoId: extractVideoId(videoData),
      platform: videoData?.platform || detectedPlatform,
      title: extractTitle(videoData),
      author: author.name,
      authorId: author.id,
      audioUrl: videoDownloadUrl,
      videoUrl: videoDownloadUrl,
      coverUrl: extractCoverUrl(videoData),
      duration,
    };

    console.log(`[Video Extract] Success: platform=${result.platform}, duration=${result.duration}s`);

    return successResp(result);
  } catch (error) {
    console.error('[Video Extract] Error:', error);
    return errorResp(error);
  }
}
