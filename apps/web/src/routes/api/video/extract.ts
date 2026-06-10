import { createFileRoute } from '@tanstack/react-router';
import { VideoTranscription } from '@db/schema/schema';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';

import type { VideoExtractResult } from '../../../actions/video-transcription/types';
import { authKey } from '../../../lib/authKey';
import { db } from '../../../lib/db';
import { errorResp, successResp, unauthResp } from '../../../lib/request';

const requestSchema = z.object({ url: z.string().min(1, 'Video URL is required') });
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
    videos: {
      url: string;
      quality: string;
      format: string;
      width: number;
      height: number;
      size: number;
    }[];
    audios: { url: string; format: string }[];
  };
}

interface LeaperOneNestedResponse<T> {
  code?: number;
  message?: string;
  data?: { data?: T };
}

interface BilibiliVideoData {
  bvid?: string;
  aid?: string | number;
  cid?: string | number;
  title?: string;
  pic?: string;
  duration?: number | string;
  owner?: { name?: string; mid?: string | number };
}

interface BilibiliSubtitleItem {
  lan?: string;
  subtitle_url?: string;
}

interface BilibiliSubtitleData {
  subtitles?: BilibiliSubtitleItem[];
}

function extractBilibiliUrl(input: string): string | null {
  try {
    const url = new URL(input);
    if (/(^|\.)bilibili\.com$/.test(url.hostname) || /(^|\.)b23\.tv$/.test(url.hostname)) {
      return input;
    }
  } catch {}

  const urlMatch = input.match(
    /https?:\/\/(?:www\.|m\.)?bilibili\.com\/\S+|https?:\/\/b23\.tv\/\S+/i,
  );
  if (urlMatch) {
    return urlMatch[0];
  }

  const bvMatch = input.match(/\bBV[0-9A-Za-z]{10}\b/);
  return bvMatch ? `https://www.bilibili.com/video/${bvMatch[0]}/` : null;
}

function parseBilibiliSubtitle(raw: unknown): string {
  if (!raw || typeof raw !== 'object') {
    return '';
  }

  const body = (raw as { body?: unknown }).body;
  if (!Array.isArray(body)) {
    return '';
  }

  return body
    .map((item) => (!item || typeof item !== 'object' ? '' : (item as { content?: unknown }).content))
    .filter((content): content is string => typeof content === 'string' && Boolean(content))
    .filter(Boolean)
    .join('\n');
}

async function fetchJson<T>(url: string, init: RequestInit, fallbackMessage: string): Promise<T> {
  const response = await fetch(url, init);
  const responseText = await response.text();
  let payload: T;

  try {
    payload = JSON.parse(responseText) as T;
  } catch {
    console.error(`[Video Extract] Non-JSON response: ${response.status} ${responseText.substring(0, 200)}`);
    throw new Error(fallbackMessage);
  }

  if (!response.ok) {
    const errorPayload = payload as { message?: unknown; error?: unknown };
    const errorMessage = errorPayload.message ?? errorPayload.error ?? response.statusText;
    throw new Error(typeof errorMessage === 'string' ? errorMessage : fallbackMessage);
  }

  return payload;
}

function isTrustedBilibiliSubtitleUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') {
      return false;
    }

    const host = url.hostname.toLowerCase();
    return (
      host === 'aisubtitle.hdslb.com' ||
      host === 'subtitle.bilibili.com' ||
      host.endsWith('.hdslb.com') ||
      host.endsWith('.bilibili.com')
    );
  } catch {
    return false;
  }
}

function getBilibiliSubtitleUrl(subtitles?: BilibiliSubtitleItem[]): string | null {
  const subtitleList = Array.isArray(subtitles) ? subtitles : [];
  const subtitle =
    subtitleList.find((item) => item?.lan === 'ai-zh' && typeof item.subtitle_url === 'string') ??
    subtitleList.find((item) => typeof item?.subtitle_url === 'string');

  if (!subtitle?.subtitle_url) {
    return null;
  }

  const subtitleUrl = subtitle.subtitle_url.startsWith('//')
    ? `https:${subtitle.subtitle_url}`
    : subtitle.subtitle_url;

  return isTrustedBilibiliSubtitleUrl(subtitleUrl) ? subtitleUrl : null;
}

async function extractBilibili(url: string): Promise<(VideoExtractResult & { transcript: string }) | null> {
  const headers = { Authorization: `Bearer ${LEAPERONE_API_KEY}` };
  const videoResult = await fetchJson<LeaperOneNestedResponse<BilibiliVideoData>>(
    `${LEAPERONE_API_BASE_URL}/social-media/data/bilibili/web/fetch_one_video_v3?url=${encodeURIComponent(url)}`,
    { headers },
    '获取 bilibili 视频信息失败',
  ).catch(() => null);

  const videoData = videoResult?.data?.data;
  const aid = String(videoData?.aid ?? '');
  const cid = String(videoData?.cid ?? '');
  if (!videoResult || !videoData?.bvid || !aid || !cid) {
    return null;
  }

  const subtitleResult = await fetchJson<LeaperOneNestedResponse<BilibiliSubtitleData>>(
    `${LEAPERONE_API_BASE_URL}/social-media/data/bilibili/web/fetch_video_subtitle?a_id=${encodeURIComponent(aid)}&c_id=${encodeURIComponent(cid)}`,
    { headers },
    '获取 bilibili 字幕失败',
  ).catch(() => null);

  const subtitleUrl = getBilibiliSubtitleUrl(subtitleResult?.data?.data?.subtitles);
  if (!subtitleResult || !subtitleUrl) {
    return null;
  }

  const subtitlePayload = await fetchJson<unknown>(
    subtitleUrl,
    { redirect: 'error' },
    '获取 bilibili 字幕内容失败',
  ).catch(() => null);
  const transcript = parseBilibiliSubtitle(subtitlePayload).trim();
  if (!subtitlePayload || !transcript) {
    return null;
  }

  return {
    videoId: String(videoData.bvid),
    platform: 'bilibili',
    title: videoData.title || '',
    author: videoData.owner?.name ?? '',
    authorId: String(videoData.owner?.mid ?? ''),
    audioUrl: '',
    videoUrl: '',
    coverUrl: videoData.pic || '',
    duration: Number(videoData.duration) || 0,
    transcript,
  };
}

async function createBilibiliTask(
  userId: string,
  videoUrl: string,
  result: VideoExtractResult & { transcript: string },
) {
  const [existing] = await db
    .select()
    .from(VideoTranscription)
    .where(
      and(
        eq(VideoTranscription.userId, userId),
        eq(VideoTranscription.platform, 'bilibili'),
        eq(VideoTranscription.videoId, result.videoId),
        eq(VideoTranscription.status, 'completed'),
      ),
    )
    .orderBy(desc(VideoTranscription.createdAt))
    .limit(1);

  if (existing) {
    return { ...result, taskId: existing.id };
  }

  const [task] = await db
    .insert(VideoTranscription)
    .values({
      userId,
      videoUrl,
      videoId: result.videoId || null,
      platform: 'bilibili',
      audioUrl: null,
      duration: result.duration || null,
      metadata: {
        title: result.title,
        author: result.author,
        authorId: result.authorId,
        coverUrl: result.coverUrl,
      },
      transcript: result.transcript,
      status: 'completed',
    })
    .returning();

  if (!task) {
    throw new Error('Failed to create transcription task');
  }

  return { ...result, taskId: task.id };
}

async function tryExtractBilibili(userId: string, inputUrl: string): Promise<VideoExtractResult | null> {
  const bilibiliUrl = extractBilibiliUrl(inputUrl);
  if (!bilibiliUrl) {
    return null;
  }

  try {
    const result = await extractBilibili(bilibiliUrl);
    if (!result) {
      console.warn(
        `[Video Extract] Bilibili extract returned no usable metadata or subtitles, falling back: ${bilibiliUrl}`,
      );
      return null;
    }

    return createBilibiliTask(userId, inputUrl, result);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(`[Video Extract] Bilibili extract failed, falling back: ${reason}`);
    return null;
  }
}

async function extractGenericVideo(url: string): Promise<VideoExtractResult> {
  const response = await fetch(
    `${LEAPERONE_API_BASE_URL}/social-media/video/extract?url=${encodeURIComponent(url)}`,
    { headers: { Authorization: `Bearer ${LEAPERONE_API_KEY}` } },
  );
  const responseText = await response.text();
  let apiResult: LeaperOneVideoResponse;

  try {
    apiResult = JSON.parse(responseText) as LeaperOneVideoResponse;
  } catch {
    console.error(`[Video Extract] Non-JSON response: ${response.status} ${responseText.substring(0, 200)}`);
    throw new Error(`视频解析服务暂时不可用 (${response.status})`);
  }

  if (!response.ok) {
    const errorPayload = apiResult as unknown as { error?: unknown };
    const errorMsg =
      typeof errorPayload.error === 'string'
        ? errorPayload.error
        : JSON.stringify(errorPayload.error || response.statusText);
    console.error(`[Video Extract] API error: ${response.status} ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const data = apiResult.data;
  if (!data || !data.videos || data.videos.length === 0) {
    throw new Error('无法获取视频信息，请检查链接是否有效');
  }

  const audioUrl = data.audios?.[0]?.url || data.videos[data.videos.length - 1]?.url || '';
  const videoUrl = data.videos[0]?.url || '';

  return {
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
}

export const Route = createFileRoute('/api/video/extract')({
  server: {
    handlers: {
      GET,
    },
  },
});

async function GET({ request }: { request: Request }) {
  try {
    const { success, userId } = await authKey(request);
    if (!success || !userId) {
      return unauthResp();
    }

    const searchParams = Object.fromEntries(new URL(request.url).searchParams);
    const params = requestSchema.parse({ url: searchParams.url });

    if (!LEAPERONE_API_KEY) {
      throw new Error('LEAPERONE_API_KEY is not configured');
    }

    console.log(`[Video Extract] URL: ${params.url}`);
    const result = (await tryExtractBilibili(userId, params.url)) || (await extractGenericVideo(params.url));
    console.log(`[Video Extract] Success: platform=${result.platform}, duration=${result.duration}s`);

    return successResp(result);
  } catch (error) {
    console.error('[Video Extract] Error:', error);
    return errorResp(error);
  }
}
