/**
 * Video info extracted from platform
 */
export interface VideoInfo {
  videoId: string;
  platform: string;
  title?: string;
  author?: string;
  authorId?: string;
  audioUrl: string;
  videoUrl?: string;
  coverUrl?: string;
  duration?: number;
}

/**
 * STT API response
 */
export interface STTResponse {
  text: string;
  language?: string;
  confidence?: number;
  segments?: Array<{
    text: string;
    start: number;
    end: number;
  }>;
}

/**
 * Configuration interface
 * Note: Video extraction config removed - now handled on web side
 */
export interface Config {
  sttApiUrl: string;
  sttApiKey: string;
  tempDir: string;
  maxFileSize: number;
}
