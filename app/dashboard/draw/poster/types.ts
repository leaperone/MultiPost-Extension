import { z } from 'zod';

export const PosterGenerationStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  DONE: 'done',
  FAILED: 'failed',
} as const;

export const ImageSize = [
  {
    category: 'size.social_media.label',
    name: 'size.social_media.instagram_poster',
    width: 1080,
    height: 1080,
  },
  {
    category: 'size.social_media.label',
    name: 'size.social_media.rednote_poster',
    width: 1080,
    height: 1440,
  },

  {
    category: 'size.ratio.label',
    name: 'size.ratio.1010',
    width: 1080,
    height: 1080,
  },
  {
    category: 'size.ratio.label',
    name: 'size.ratio.1609',
    width: 1920,
    height: 1080,
  },
  {
    category: 'size.ratio.label',
    name: 'size.ratio.4030',
    width: 1080,
    height: 810,
  },
] as const;

export const Category = [
  {
    name: 'category.social_media_generator',
    systemPrompt: '{{seede-scene-social-media-generator}}',
    tag: 'social-media',
  },
  {
    name: 'category.wechat_cover_generator',
    systemPrompt: '{{seede-scene-wechat-cover-generator}}',
    tag: 'wechat-cover',
  },
  {
    name: 'category.poster_generator',
    systemPrompt: '{{seede-scene-poster-generator}}',
    tag: 'poster',
  },
  {
    name: 'category.infographic_generator',
    systemPrompt: '{{seede-scene-infographic-generator}}',
    tag: 'infographic',
  },
  {
    name: 'category.ai_flyer_generator',
    systemPrompt: '{{seede-scene-ai-flyer-generator}}',
    tag: 'flyer',
  },
  {
    name: 'category.menu_generator',
    systemPrompt: '{{seede-scene-menu-generator}}',
    tag: 'menu',
  },
  {
    name: 'category.invitation_generator',
    systemPrompt: '{{seede-scene-invitation-generator}}',
    tag: 'invitation',
  },
  {
    name: 'category.music_album_generator',
    systemPrompt: '{{seede-scene-music-album-generator}}',
    tag: 'Album%20cover',
  },
  {
    name: 'category.signage_generator',
    systemPrompt: '{{seede-scene-signage-generator}}',
    tag: 'signage',
  },
  {
    name: 'category.event_promotion_generator',
    systemPrompt: '{{seede-scene-event-promotion-generator}}',
    tag: 'event-promotion',
  },
];

// Zod schemas
export const PosterGenerationSchema = z.object({
  prompt: z.string().min(3, { message: 'Prompt is required' }),
  model: z.string().default('deepseek-v3'),
  width: z.number().default(1080),
  height: z.number().default(1440),
  // images: z.array(z.string().url()).optional(),
  category: z.string().optional().default('category.social_media_generator'),
});

export type PosterGenerationSchema = z.infer<typeof PosterGenerationSchema>;

export interface PosterTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail_path: string;
  meta: {
    size: {
      w: number;
      h: number;
    };
    model: string;
    prompt: string;
  };
}
