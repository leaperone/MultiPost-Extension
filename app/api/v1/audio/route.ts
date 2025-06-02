/**
 * @file Audio transcription API endpoint
 * @description Handles audio file upload, converts m4a to mp3, and performs transcription
 */

import { NextRequest } from 'next/server';
import { authKey } from '@/actions/authKey';
import { successResp, errorResp, unauthResp } from '@/lib/request';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync, createReadStream } from 'fs';
import path from 'path';
import { createId } from '@paralleldrive/cuid2';
import FormData from 'form-data';

const execAsync = promisify(exec);

/**
 * Audio transcription response interface
 */
export interface TranscriptionResponse {
  duration: number;
  language: string;
  segments: Segment[];
  task: string;
  text: string;
  [property: string]: unknown;
}

export interface Segment {
  avg_logprob: number;
  compression_ratio: number;
  end: number;
  id: number;
  language: string;
  no_speech_prob: number;
  seek: number;
  start: number;
  temperature: number;
  text: string;
  tokens: number[];
  [property: string]: unknown;
}

/**
 * Converts audio file from m4a to mp3 format using FFmpeg
 * @param inputPath - Path to input m4a file
 * @param outputPath - Path to output mp3 file
 * @returns Promise that resolves when conversion is complete
 */
async function convertM4aToMp3(inputPath: string, outputPath: string): Promise<void> {
  try {
    const command = `ffmpeg -i "${inputPath}" -codec:a libmp3lame -b:a 192k "${outputPath}"`;
    await execAsync(command);
  } catch (error) {
    throw new Error(`Audio conversion failed: ${(error as Error).message}`);
  }
}

/**
 * Sends audio file to transcription API
 * @param filePath - Path to mp3 file
 * @param fileName - Original file name
 * @returns Transcription response
 */
async function transcribeAudio(filePath: string, fileName: string): Promise<TranscriptionResponse> {
  try {
    const formData = new FormData();
    formData.append('file', createReadStream(filePath), {
      filename: fileName.replace(/\.[^/.]+$/, '.mp3'),
      contentType: 'audio/mpeg',
    });
    formData.append('timestamp_granularities[]', 'segment');
    formData.append('response_format', 'verbose_json');

    const response = await fetch('https://borgcloud.org/api/v1/audio/transcriptions', {
      method: 'POST',
      body: formData as unknown as BodyInit,
      headers: {
        Authorization: 'Bearer null',
        ...formData.getHeaders(),
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = (await response.json()) as TranscriptionResponse;
    return result;
  } catch (error) {
    throw new Error(`Transcription API failed: ${(error as Error).message}`);
  }
}

/**
 * Ensures temporary directory exists
 */
async function ensureTempDir(): Promise<string> {
  const tempDir = path.join(process.cwd(), 'temp');
  if (!existsSync(tempDir)) {
    await mkdir(tempDir, { recursive: true });
  }
  return tempDir;
}

/**
 * Cleans up temporary files
 */
async function cleanup(filePaths: string[]): Promise<void> {
  await Promise.all(
    filePaths.map(async (filePath) => {
      try {
        await unlink(filePath);
      } catch (error) {
        console.warn(`Failed to cleanup file ${filePath}:`, error);
      }
    }),
  );
}

export async function POST(req: NextRequest) {
  let tempFiles: string[] = [];

  try {
    // Authentication check
    const { userId } = await authKey(req);
    if (!userId) {
      return unauthResp();
    }

    // Parse multipart form data
    const formData = await req.formData();
    const audioFile = formData.get('file') as File;

    if (!audioFile) {
      return errorResp('No audio file provided');
    }

    // Validate file type
    if (!audioFile.type.includes('audio') && !audioFile.name.toLowerCase().endsWith('.m4a')) {
      return errorResp('Invalid file type. Please upload an audio file.');
    }

    // Ensure temp directory exists
    const tempDir = await ensureTempDir();

    // Generate unique file IDs
    const fileId = createId();
    const inputFileName = `${fileId}_input.m4a`;
    const outputFileName = `${fileId}_output.mp3`;

    const inputPath = path.join(tempDir, inputFileName);
    const outputPath = path.join(tempDir, outputFileName);

    tempFiles = [inputPath, outputPath];

    // Save uploaded file to temp directory
    const arrayBuffer = await audioFile.arrayBuffer();
    await writeFile(inputPath, new Uint8Array(arrayBuffer));

    // Convert m4a to mp3
    await convertM4aToMp3(inputPath, outputPath);

    // Transcribe audio
    const transcriptionResult = await transcribeAudio(outputPath, audioFile.name);

    // Cleanup temporary files
    await cleanup(tempFiles);

    return successResp({
      text: transcriptionResult.text,
      duration: transcriptionResult.duration,
      language: transcriptionResult.language,
      segments: transcriptionResult.segments,
      task: transcriptionResult.task,
    });
  } catch (error) {
    // Cleanup on error
    if (tempFiles.length > 0) {
      await cleanup(tempFiles);
    }

    console.error('Audio transcription error:', error);
    return errorResp(error);
  }
}
