import { z } from 'zod';

export const PosterGenerationStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  DONE: 'done',
  FAILED: 'failed',
} as const;

export const ImageSize = [
  {
    category: 'size.social_media',
    name: 'size.social_media.instagram_poster',
    width: 1080,
    height: 1080,
  },
  {
    category: 'size.social_media',
    name: 'size.social_media.rednote_poster',
    width: 1080,
    height: 1440,
  },

  {
    category: 'size.ratio',
    name: 'size.ratio.1010',
    width: 1080,
    height: 1080,
  },
  {
    category: 'size.ratio',
    name: 'size.ratio.1609',
    width: 1920,
    height: 1080,
  },
  {
    category: 'size.ratio',
    name: 'size.ratio.4030',
    width: 1080,
    height: 810,
  },
] as const;

export const systemPrompt = [
  {
    name: 'system_prompt.wechat_cover_generator',
    prompt: 'seede-scene-wechat-cover-generator',
  },
];

// Zod schemas
export const PosterGenerationSchema = z.object({
  prompt: z.string().min(3, { message: 'Prompt is required' }),
  model: z.string().default('deepseek-v3'),
  width: z.number().default(1080),
  height: z.number().default(1440),
  // images: z.array(z.string().url()).optional(),
});

export type PosterGenerationSchema = z.infer<typeof PosterGenerationSchema>;
