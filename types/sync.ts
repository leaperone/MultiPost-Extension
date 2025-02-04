export const SUPPORT_PLATFORMS = [
    'BilibiliDynamic',
    'XDynamic',
    'RedNoteImage',
    'WeiboDynamic',
    'XueqiuDynamic',
    'ZhihuDynamic',
    'DouyinImage',
    'BilibiliVideo',
    'DouyinVideo',
    'YoutubeVideo',
    'RedNoteVideo',
    'InstagramImage',
  ];
  export const PLATFORM_NEED_IMAGE = ['RedNoteImage', 'DouyinImage', 'InstagramImage'];
  
  export type Platform =
    | 'BilibiliDynamic'
    | 'XDynamic'
    | 'RedNoteImage'
    | 'WeiboDynamic'
    | 'XueqiuDynamic'
    | 'ZhihuDynamic'
    | 'DouyinImage'
    | 'BilibiliVideo'
    | 'DouyinVideo'
    | 'YoutubeVideo'
    | 'RedNoteVideo'
    | 'InstagramImage';
  
  export function getUrl(platform: string): string | null {
    const urlMap: Record<string, string> = {
      XDynamic: 'https://x.com/home',
      BilibiliDynamic: 'https://t.bilibili.com',
      RedNoteImage: 'https://creator.xiaohongshu.com/publish/publish',
      WeiboDynamic: 'https://weibo.com',
      XueqiuDynamic: 'https://xueqiu.com',
      ZhihuDynamic: 'https://www.zhihu.com',
      DouyinImage: 'https://creator.douyin.com/creator-micro/content/upload?default-tab=3',
      BilibiliVideo: 'https://member.bilibili.com/platform/upload/video/frame',
      DouyinVideo: 'https://creator.douyin.com/creator-micro/content/upload',
      YoutubeVideo: 'https://studio.youtube.com/',
      RedNoteVideo: 'https://creator.xiaohongshu.com/publish/publish',
      InstagramImage: 'https://www.instagram.com/',
    };
  
    return urlMap[platform] || null;
  }
  
  export interface SyncData {
    platforms: string[];
    auto_publish: boolean;
    data: DynamicData | PostData | VideoData;
  }
  
  export interface DynamicData {
    title: string;
    content: string;
    images: FileData[];
    videos: FileData[];
  }
  
  export interface FileData {
    name: string;
    url: string;
    type: string;
    size: number;
    base64?: string;
  }
  
  export interface PostData {
    title: string;
    content: string;
  }
  
  export interface VideoData {
    title: string;
    content: string;
    video: FileData;
  }