import { z } from 'zod';

export const ImageGenerationStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export const ImageSize = {
  AUTO: 'auto',
  SQUARE: '1024x1024',
  SQUARE_1080: '1080x1080',
  LANDSCAPE: '1536x1024',
  LANDSCAPE_1920: '1920x1080',
  PORTRAIT: '1024x1536',
  PORTRAIT_1080: '1080x1920',
} as const;

export const Composition = {
  Bokeh: 'bokeh',
  CloseUp: 'close-up',
  FullBody: 'full-body',
  HalfBody: 'half-body',
  Headshot: 'headshot',
} as const;

export const CompositionPrompt = {
  [Composition.Bokeh]: 'bokeh',
  [Composition.CloseUp]: 'close-up',
  [Composition.FullBody]: 'full-body',
  [Composition.HalfBody]: 'half-body',
  [Composition.Headshot]: 'headshot',
} as const;

export const Color = {
  Cold: 'cold',
  Warm: 'warm',
  Neutral: 'neutral',
  Monochrome: 'monochrome',
} as const;

export const ColorPrompt = {
  [Color.Cold]: 'cold',
  [Color.Warm]: 'warm',
  [Color.Neutral]: 'neutral',
  [Color.Monochrome]: 'monochrome',
} as const;

export const Style = {
  Anime: 'anime',
  Cartoon: 'cartoon',
  Realistic: 'realistic',
  Vintage: 'vintage',
} as const;

/**
 * 风格提示词映射
 * @description 将风格枚举值映射到对应的提示词
 * @constant {Record<keyof typeof Style, string>}
 */
export const StylePrompt = {
  [Style.Anime]: '动漫风格，鲜艳的色彩，富有表现力的眼睛，细致的角色设计',
  [Style.Cartoon]: '卡通风格，简化的形状，粗线条轮廓，活泼的色彩',
  [Style.Realistic]: '写实风格，细致的纹理，自然的光影，照片级真实感',
  [Style.Vintage]: '复古风格，怀旧的色彩，胶片颗粒感，经典摄影效果',
} as const;

export const getPrompt = (type: string, value: string) => {
  if (type === 'composition') {
    return CompositionPrompt[value as keyof typeof CompositionPrompt] || '';
  }
  if (type === 'color') {
    return ColorPrompt[value as keyof typeof ColorPrompt] || '';
  }
  return StylePrompt[value as keyof typeof StylePrompt] || '';
};

export interface ImageGenerationResultItem {
  url: string;
  revised_prompt?: string;
}

// Zod schemas
export const ImageGenerationSchema = z.object({
  prompt: z.string().min(3, { message: 'Prompt is required' }),
  number: z.number().min(1),
  size: z.enum([
    ImageSize.AUTO,
    ImageSize.SQUARE,
    ImageSize.SQUARE_1080,
    ImageSize.LANDSCAPE,
    ImageSize.LANDSCAPE_1920,
    ImageSize.PORTRAIT,
    ImageSize.PORTRAIT_1080,
  ]),
  quality: z.string().default('auto'),
  composition: z.string().optional(),
  color: z.string().optional(),
  style: z.string().optional(),
  images: z.array(z.string().url()).optional(),
  extraPrompt: z.string().optional(),
});

export type ImageGenerationSchema = z.infer<typeof ImageGenerationSchema>;

// FileHosting interface based on Prisma schema
export interface FileHosting {
  id: string;
  userId: string;
  key: string;
  type: string | null;
  size: number;
  times: number;
  filename: string | null;
  previewUrl: string | null;
  source: string | null;
  expiredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// ImageGenerationLog interface based on Prisma schema
export interface ImageGenerationLog {
  id: string;
  userId: string;
  imageGenerationId: string;
  error: string | null;
  response: unknown;
  url: string | null;
  previewUrl: string | null;
  fileHostingId: string | null;
  createdAt: Date;
  updatedAt: Date;
  fileHosting: FileHosting | null;
}

// Complete ImageGeneration interface based on Prisma schema
export interface ImageGeneration {
  id: string;
  userId: string;
  prompt: string;
  extraPrompt: string | null;
  images: unknown;
  mask: unknown;
  number: number;
  size: string;
  quality: string;
  background: string;
  status: string;
  message: string | null;
  error?: string | null;
  workflowId: string | null;
  createdAt: Date | string;
  updatedAt: Date;
  ImageGenerationLog: ImageGenerationLog[];
}
