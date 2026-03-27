import { auth } from '@/auth';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { successResp, errorResp, unauthResp } from '@/lib/request';

const requestSchema = z.object({
  url: z.string().min(1, 'Video URL is required'),
});

const LEAPERONE_API_BASE_URL = process.env.LEAPERONE_API_BASE_URL || 'https://api.leaper.one/v1';
const LEAPERONE_API_KEY = process.env.LEAPERONE_API_KEY;

interface LeaperOneVideoResponse {
  platform: string;
  data: {
    platform: string;
    videoId: string;
    title: string;
    author: string;
    authorId: string;
    coverUrl: string;
    duration: number;
    videos: { url: string; quality: string; format: string; width: number; height: number; size: number }[];
    audios: { url: string; format: string }[];
  };
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

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return unauthResp();
    }

    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const params = requestSchema.parse({ url: searchParams.url });

    if (!LEAPERONE_API_KEY) {
      throw new Error('LEAPERONE_API_KEY is not configured');
    }

    console.log(`[Video Extract] URL: ${params.url}`);

    const response = await fetch(
      `${LEAPERONE_API_BASE_URL}/social-media/video/extract?url=${encodeURIComponent(params.url)}`,
      {
        headers: {
          Authorization: `Bearer ${LEAPERONE_API_KEY}`,
        },
      },
    );

    if (!response.ok) {
      const text = await response.text();
      console.error(`[Video Extract] API error: ${response.status} ${text}`);
      throw new Error('视频解析失败，请检查链接是否有效或该平台是否支持');
    }

    const apiResult: LeaperOneVideoResponse = await response.json();
    const data = apiResult.data;

    if (!data || !data.videos || data.videos.length === 0) {
      throw new Error('无法获取视频信息，请检查链接是否有效');
    }

    // audioUrl: prefer audios[0], fallback to lowest quality video
    const audioUrl = data.audios?.[0]?.url || data.videos[data.videos.length - 1]?.url || '';
    // videoUrl: highest quality video (first in array)
    const videoUrl = data.videos[0]?.url || '';

    const result: VideoExtractResult = {
      videoId: data.videoId || '',
      platform: data.platform || apiResult.platform || '',
      title: data.title || '',
      author: data.author || '',
      authorId: data.authorId || '',
      audioUrl,
      videoUrl,
      coverUrl: data.coverUrl || '',
      duration: data.duration || 0,
    };

    console.log(`[Video Extract] Success: platform=${result.platform}, duration=${result.duration}s`);

    return successResp(result);
  } catch (error) {
    console.error('[Video Extract] Error:', error);
    return errorResp(error);
  }
}
