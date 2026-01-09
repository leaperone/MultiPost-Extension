import type { Config } from './types.ts';

/**
 * Get configuration from environment variables
 * Note: Video extraction (TikHub) config removed - now handled on web side
 */
export function getConfig(): Config {
  return {
    sttApiUrl: Deno.env.get('STT_API_URL') || 'https://borgcloud.org/api/v1/audio/transcriptions',
    sttApiKey: Deno.env.get('STT_API_KEY') || Deno.env.get('BORGCLOUD_API_KEY') || '',

    tempDir: './tmp',
    maxFileSize: 524288000, // 500MB
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config: Config): void {
  if (!config.sttApiUrl) {
    throw new Error('STT_API_URL is required');
  }

  if (!config.sttApiKey) {
    throw new Error('STT_API_KEY is required');
  }
}
