import type { Config } from './types.ts';

/**
 * Get configuration from environment variables
 * Uses LEAPERONE_API_BASE_URL + LEAPERONE_API_KEY for STT
 */
export function getConfig(): Config {
  const baseUrl = (Deno.env.get('LEAPERONE_API_BASE_URL') || 'https://api.leaper.one/v1').replace(/\/$/, '');
  return {
    sttApiUrl: `${baseUrl}/audio/transcriptions`,
    sttApiKey: Deno.env.get('LEAPERONE_API_KEY') || '',

    tempDir: './tmp',
    maxFileSize: 524288000, // 500MB
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config: Config): void {
  if (!config.sttApiKey) {
    throw new Error('LEAPERONE_API_KEY is required');
  }
}
