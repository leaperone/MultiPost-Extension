'use client';

import { getSupportUploadUrl } from '@/src/actions/support';
import type { SupportStatus, SupportMessageRole, SupportCategory } from '@/src/actions/support/types';

// --- Image compression ---

/** Compress an image File to a Blob under maxSize bytes */
export async function compressImageToBlob(file: File, maxSize = 512 * 1024): Promise<Blob> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  return compressDataUrlToBlob(dataUrl, maxSize);
}

/** Compress a data URL string to a Blob under maxSize bytes */
export async function compressDataUrlToBlob(dataUrl: string, maxSize = 512 * 1024): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });

  const canvas = document.createElement('canvas');
  let { width, height } = img;

  // Scale down if image is very large
  const MAX_DIMENSION = 1920;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');
  ctx.drawImage(img, 0, 0, width, height);

  // Try decreasing quality until under maxSize
  let quality = 0.9;
  let blob: Blob | null = null;

  while (quality > 0.1) {
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (blob && blob.size <= maxSize) return blob;
    quality -= 0.1;
  }

  // Last resort: return whatever we got
  if (blob) return blob;
  throw new Error('Failed to compress image');
}

// --- Upload helper ---

/** Upload a blob as a support attachment, returns the S3 key */
export async function uploadSupportImage(blob: Blob, conversationId?: string): Promise<string> {
  const result = await getSupportUploadUrl({ data: { conversationId } });
  if (!result.success) {
    throw new Error(result.error || 'Failed to get upload URL');
  }

  const { key, uploadUrl } = result;

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: blob,
    headers: {
      'Content-Type': blob.type || 'image/jpeg',
    },
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
  }

  return key;
}

// --- Browser info collection ---

/** Collect browser and device information for support diagnostics */
export function collectBrowserInfo(): Record<string, unknown> {
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    languages: navigator.languages ? [...navigator.languages] : undefined,
    platform: navigator.platform,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    screenWidth: screen.width,
    screenHeight: screen.height,
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timestamp: new Date().toISOString(),
  };
}

// --- Display constants (i18n-aware factory functions) ---

/** Translation function type compatible with i18next t() */
type TFunction = (key: string, options?: Record<string, unknown>) => string;

export function getStatusConfig(t: TFunction): Record<SupportStatus, { label: string; color: string }> {
  return {
    open: { label: t('status.open'), color: 'primary' },
    pending: { label: t('status.pending'), color: 'warning' },
    in_progress: { label: t('status.in_progress'), color: 'secondary' },
    resolved: { label: t('status.resolved'), color: 'success' },
    closed: { label: t('status.closed'), color: 'default' },
  };
}

export function getRoleStyles(t: TFunction): Record<SupportMessageRole, { align: string; bubble: string; label: string }> {
  return {
    user: { align: 'items-end', bubble: 'bg-primary text-primary-foreground', label: t('role.user') },
    ai: { align: 'items-start', bubble: 'bg-muted text-foreground', label: t('role.ai') },
    agent: { align: 'items-start', bubble: 'bg-muted text-foreground', label: t('role.agent') },
  };
}

export function getCategoryLabels(t: TFunction): Record<SupportCategory, string> {
  return {
    bug: t('category.bug'),
    suggestion: t('category.suggestion'),
    account: t('category.account'),
    other: t('category.other'),
  };
}
