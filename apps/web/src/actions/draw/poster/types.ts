import { z } from 'zod';

export const PosterGenerationStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
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

export const SeedeTheme = [
  {
    value: 'default',
    label: 'theme.default',
    colors: ['#000000', '#FFFFFF', '#666666', '#F5F5F5'],
    primaryColor: '#000000',
    secondaryColor: '#FFFFFF',
  },
  {
    value: 'black',
    label: 'theme.black',
    colors: ['#000000', '#FFFFFF', '#666666', '#F5F5F5'],
    primaryColor: '#000000',
    secondaryColor: '#FFFFFF',
  },
  {
    value: 'ocean',
    label: 'theme.ocean',
    colors: ['#0EA5E9', '#0284C7', '#0369A1', '#E0F2FE'],
    primaryColor: '#0EA5E9',
    secondaryColor: '#E0F2FE',
  },
  {
    value: 'sunset',
    label: 'theme.sunset',
    colors: ['#F97316', '#EA580C', '#DC2626', '#FEF3C7'],
    primaryColor: '#F97316',
    secondaryColor: '#FEF3C7',
  },
  {
    value: 'forest',
    label: 'theme.forest',
    colors: ['#059669', '#047857', '#065F46', '#ECFDF5'],
    primaryColor: '#059669',
    secondaryColor: '#ECFDF5',
  },
  {
    value: 'lavender',
    label: 'theme.lavender',
    colors: ['#8B5CF6', '#7C3AED', '#6D28D9', '#F3E8FF'],
    primaryColor: '#8B5CF6',
    secondaryColor: '#F3E8FF',
  },
  {
    value: 'rose',
    label: 'theme.rose',
    colors: ['#EC4899', '#DB2777', '#BE185D', '#FDF2F8'],
    primaryColor: '#EC4899',
    secondaryColor: '#FDF2F8',
  },
  {
    value: 'golden',
    label: 'theme.golden',
    colors: ['#F59E0B', '#D97706', '#B45309', '#FFFBEB'],
    primaryColor: '#F59E0B',
    secondaryColor: '#FFFBEB',
  },
  {
    value: 'midnight',
    label: 'theme.midnight',
    colors: ['#1E293B', '#0F172A', '#020617', '#F1F5F9'],
    primaryColor: '#1E293B',
    secondaryColor: '#F1F5F9',
  },
] as const;

export type SeedeThemeItem = (typeof SeedeTheme)[number];

export const Category = [
  {
    name: 'category.social_media_generator',
    systemPrompt: '{{seede-scene-social-media-generator}}',
    tag: 'social-media',
    scene: 'socialMedia' as const,
  },
  {
    name: 'category.wechat_cover_generator',
    systemPrompt: '{{seede-scene-wechat-cover-generator}}',
    tag: 'wechat-cover',
    scene: 'socialMedia' as const,
  },
  {
    name: 'category.poster_generator',
    systemPrompt: '{{seede-scene-poster-generator}}',
    tag: 'poster',
    scene: 'poster' as const,
  },
  {
    name: 'category.infographic_generator',
    systemPrompt: '{{seede-scene-infographic-generator}}',
    tag: 'infographic',
    scene: 'scrollytelling' as const,
  },
  {
    name: 'category.ai_flyer_generator',
    systemPrompt: '{{seede-scene-ai-flyer-generator}}',
    tag: 'flyer',
    scene: 'poster' as const,
  },
  {
    name: 'category.menu_generator',
    systemPrompt: '{{seede-scene-menu-generator}}',
    tag: 'menu',
    scene: 'socialMedia' as const,
  },
  {
    name: 'category.invitation_generator',
    systemPrompt: '{{seede-scene-invitation-generator}}',
    tag: 'invitation',
    scene: 'poster' as const,
  },
  {
    name: 'category.music_album_generator',
    systemPrompt: '{{seede-scene-music-album-generator}}',
    tag: 'Album%20cover',
    scene: 'poster' as const,
  },
  {
    name: 'category.signage_generator',
    systemPrompt: '{{seede-scene-signage-generator}}',
    tag: 'signage',
    scene: 'poster' as const,
  },
  {
    name: 'category.event_promotion_generator',
    systemPrompt: '{{seede-scene-event-promotion-generator}}',
    tag: 'event-promotion',
    scene: 'poster' as const,
  },
];

export const REFERENCE_IMAGE_TAGS = ['all', 'layout', 'style', 'color', 'texture', 'copy', 'font'] as const;
export type ReferenceImageTag = (typeof REFERENCE_IMAGE_TAGS)[number];

export interface SeedeMaterialData {
  filename: string;
  url: string;
  width: number;
  height: number;
  aspectRatio: number;
  tag: string;
}

export interface SeedeDocumentData {
  filename: string;
  id: string;
}

export const EXPORT_FORMATS = ['png', 'webp', 'jpg'] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const PosterGenerationSchema = z.object({
  prompt: z.string().min(3, { message: 'Prompt is required' }),
  model: z.string().default('gemini-2.5-flash'),
  width: z.number().default(1080),
  height: z.number().default(1440),
  format: z.enum(['png', 'webp', 'jpg']).default('webp'),
  category: z.string().optional().default('category.social_media_generator'),
  theme: z.string().optional().default('default'),
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
