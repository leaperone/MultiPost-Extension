import type { Config } from '../types.ts';
import type { STTResponse } from '../types.ts';
import { logger } from '../utils/logger.ts';
import { getErrorMessage } from '../utils/error.ts';

/**
 * Speech-to-Text service
 * Converts audio to text using external STT API
 * Supports video files - automatically extracts audio using ffmpeg
 */
export class STTService {
  private tempDir = './tmp';

  constructor(private config: Config) {}

  /**
   * Transcribe audio/video to text
   * @param mediaUrl - URL of the audio or video file
   * @param language - Optional language code (e.g., 'en', 'zh')
   * @returns Transcription result
   */
  async transcribe(mediaUrl: string, language?: string): Promise<STTResponse> {
    const timerLabel = `Transcription for ${mediaUrl.substring(0, 50)}...`;
    logger.startTimer(timerLabel);
    logger.emoji('🎬', 'Starting transcription');
    logger.debug('Media URL:', mediaUrl);
    logger.debug('Language:', language || 'auto-detect');

    try {
      // Ensure temp directory exists
      await Deno.mkdir(this.tempDir, { recursive: true });
      logger.debug(`Temp directory ensured: ${this.tempDir}`);

      // Check if the URL already points to an audio file
      const isAudioFile = /\.(mp3|wav|ogg|aac|m4a|flac|webm)(\?|$)/i.test(mediaUrl);

      let audioFile: string;

      if (isAudioFile) {
        // Already an audio file, download directly without ffmpeg
        logger.emoji('⬇️', 'Step 1/2: Downloading audio file (skipping ffmpeg)...');
        logger.startTimer('download');
        audioFile = await this.downloadFile(mediaUrl, 'audio.mp3');
        logger.endTimer('download');
      } else {
        // Video file: download + extract audio with ffmpeg
        logger.emoji('⬇️', 'Step 1/3: Downloading media file...');
        logger.startTimer('download');
        const videoFile = await this.downloadFile(mediaUrl, 'video.mp4');
        logger.endTimer('download');

        logger.emoji('🎵', 'Step 2/3: Extracting audio with ffmpeg...');
        logger.startTimer('ffmpeg');
        audioFile = await this.extractAudio(videoFile);
        logger.endTimer('ffmpeg');

        // Clean up video file early
        await this.cleanup(videoFile);
      }

      // Transcribe audio
      const stepNum = isAudioFile ? '2/2' : '3/3';
      logger.emoji('🤖', `Step ${stepNum}: Sending audio to STT API...`);
      logger.startTimer('stt-api');
      const result = await this.transcribeAudio(audioFile, language);
      logger.endTimer('stt-api');

      // Cleanup audio file
      logger.emoji('🧹', 'Cleaning up temporary files...');
      await this.cleanup(audioFile);

      logger.endTimer(timerLabel);
      logger.success('✅ Transcription completed successfully!');
      logger.info(`Result: ${result.segments?.length || 0} segments, ${result.text.length} characters`);

      return result;
    } catch (error) {
      logger.endTimer(timerLabel);
      logger.error('❌ Failed to transcribe media:', error);
      throw new Error(`Transcription failed: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Download file from URL
   */
  private async downloadFile(url: string, filename: string): Promise<string> {
    const filepath = `${this.tempDir}/${Date.now()}-${filename}`;
    logger.debug(`Downloading to: ${filepath}`);

    const downloadStart = performance.now();
    const response = await fetch(url);

    if (!response.ok) {
      logger.error(`Download failed: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      logger.debug(`Content-Length: ${parseInt(contentLength) / 1024 / 1024} MB`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const downloadDuration = performance.now() - downloadStart;

    await Deno.writeFile(filepath, new Uint8Array(arrayBuffer));

    const fileInfo = await Deno.stat(filepath);
    const fileSizeMB = fileInfo.size / 1024 / 1024;
    const downloadSpeed = (fileSizeMB / (downloadDuration / 1000)).toFixed(2);

    logger.fileSize('Downloaded file', fileInfo.size);
    logger.debug(`Download speed: ${downloadSpeed} MB/s`);
    logger.debug(`File path: ${filepath}`);

    return filepath;
  }

  /**
   * Extract audio from video using ffmpeg
   */
  private async extractAudio(videoFile: string): Promise<string> {
    const audioFile = videoFile.replace(/\.\w+$/, '.mp3');

    const videoInfo = await Deno.stat(videoFile);
    logger.debug(`Input video file: ${videoFile}`);
    logger.fileSize('Input video size', videoInfo.size);
    logger.debug(`Output audio file: ${audioFile}`);

    const ffmpegArgs = [
      '-i', videoFile,
      '-vn', // No video
      '-acodec', 'libmp3lame', // MP3 codec
      '-ab', '192k', // Bitrate
      '-ar', '44100', // Sample rate
      '-y', // Overwrite output file
      audioFile,
    ];

    logger.debug(`ffmpeg command: ffmpeg ${ffmpegArgs.join(' ')}`);

    const command = new Deno.Command('ffmpeg', {
      args: ffmpegArgs,
      stdout: 'piped',
      stderr: 'piped',
    });

    const extractStart = performance.now();
    const { code, stderr } = await command.output();
    const extractDuration = performance.now() - extractStart;

    if (code !== 0) {
      const errorOutput = new TextDecoder().decode(stderr);
      logger.error('❌ ffmpeg error output:', errorOutput);
      throw new Error(`ffmpeg failed with code ${code}`);
    }

    const audioInfo = await Deno.stat(audioFile);
    const compressionRatio = ((1 - audioInfo.size / videoInfo.size) * 100).toFixed(1);

    logger.fileSize('Extracted audio size', audioInfo.size);
    logger.debug(`Compression ratio: ${compressionRatio}%`);
    logger.debug(`Extraction time: ${(extractDuration / 1000).toFixed(2)}s`);

    // Log ffmpeg output for debugging
    const stderrText = new TextDecoder().decode(stderr);
    if (stderrText.includes('Duration:')) {
      const durationMatch = stderrText.match(/Duration: (\d{2}:\d{2}:\d{2}\.\d{2})/);
      if (durationMatch) {
        logger.debug(`Video duration: ${durationMatch[1]}`);
      }
    }

    return audioFile;
  }

  /**
   * Transcribe audio file using STT API with retry logic
   */
  private async transcribeAudio(
    audioFile: string,
    language?: string,
  ): Promise<STTResponse> {
    // Read audio file
    const audioData = await Deno.readFile(audioFile);

    logger.fileSize('Audio file to transcribe', audioData.length);
    logger.debug(`STT API URL: ${this.config.sttApiUrl}`);
    logger.debug(`Language: ${language || 'auto-detect'}`);

    // Retry configuration
    const maxRetries = 5;
    const baseDelayMs = 30000; // 30 seconds base delay for 503 errors
    const retryableStatuses = [503, 429, 502, 504]; // Service unavailable, rate limit, bad gateway, timeout

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Create fresh form data for each attempt (FormData can only be consumed once)
        const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.mp3');
        formData.append('response_format', 'verbose_json');
        formData.append('timestamp_granularities', 'segment');

        if (language) {
          formData.append('language', language);
        }

        if (attempt > 1) {
          logger.emoji('🔄', `Retry attempt ${attempt}/${maxRetries}...`);
        } else {
          logger.debug('Form data prepared, sending request...');
        }

        // Send request to STT API
        const requestStart = performance.now();
        const response = await fetch(this.config.sttApiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.sttApiKey}`,
          },
          body: formData,
        });
        const requestDuration = performance.now() - requestStart;

        logger.debug(`STT API response status: ${response.status}`);
        logger.debug(`Request duration: ${(requestDuration / 1000).toFixed(2)}s`);

        if (!response.ok) {
          const errorText = await response.text();
          logger.error(`STT API error response: ${errorText}`);

          // Check if we should retry
          if (retryableStatuses.includes(response.status) && attempt < maxRetries) {
            // Calculate delay with exponential backoff (30s, 60s, 120s, 240s)
            const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
            const delaySeconds = Math.round(delayMs / 1000);
            logger.warn(`⏳ STT API returned ${response.status}, waiting ${delaySeconds}s before retry...`);
            await this.sleep(delayMs);
            lastError = new Error(`STT API error: ${response.status} ${errorText}`);
            continue;
          }

          throw new Error(`STT API error: ${response.status} ${errorText}`);
        }

        const data = await response.json();

        logger.debug('STT API response received');
        logger.debug(`Text length: ${data.text?.length || 0} characters`);
        logger.debug(`Segments: ${data.segments?.length || 0}`);
        logger.debug(`Detected language: ${data.language || 'unknown'}`);

        if (data.segments && data.segments.length > 0) {
          const firstSegment = data.segments[0];
          const lastSegment = data.segments[data.segments.length - 1];
          logger.debug(`First segment: [${firstSegment.start}s] ${firstSegment.text?.substring(0, 30)}...`);
          logger.debug(`Last segment: [${lastSegment.start}s] ${lastSegment.text?.substring(0, 30)}...`);
        }

        if (attempt > 1) {
          logger.success(`✅ STT API succeeded on attempt ${attempt}`);
        }

        return {
          text: data.text || '',
          language: data.language,
          confidence: data.confidence,
          segments: data.segments || [],
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // If it's not a retryable error or we're on the last attempt, throw
        if (attempt >= maxRetries) {
          logger.error(`❌ STT API failed after ${maxRetries} attempts`);
          throw lastError;
        }

        // For network errors, also retry
        if (error instanceof TypeError && error.message.includes('fetch')) {
          const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
          const delaySeconds = Math.round(delayMs / 1000);
          logger.warn(`⏳ Network error, waiting ${delaySeconds}s before retry...`);
          await this.sleep(delayMs);
          continue;
        }

        throw lastError;
      }
    }

    throw lastError || new Error('STT API failed with unknown error');
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup temporary files
   */
  private async cleanup(...files: string[]) {
    logger.debug(`Cleaning up ${files.length} temporary files...`);
    let cleaned = 0;
    for (const file of files) {
      try {
        const fileInfo = await Deno.stat(file);
        await Deno.remove(file);
        logger.debug(`✓ Cleaned up: ${file} (${(fileInfo.size / 1024).toFixed(2)} KB)`);
        cleaned++;
      } catch (error) {
        logger.warn(`✗ Failed to cleanup file: ${file}`, error);
      }
    }
    logger.success(`Cleaned up ${cleaned}/${files.length} temporary files`);
  }

  /**
   * Get supported languages
   */
  async getSupportedLanguages(): Promise<string[]> {
    // TODO: Implement based on actual STT API
    return ['en', 'zh', 'ja', 'es', 'fr', 'de'];
  }
}
