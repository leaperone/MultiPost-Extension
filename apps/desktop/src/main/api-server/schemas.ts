/**
 * Request validation for the external API. Media entries accept either an
 * absolute local path or an http(s) URL (string or object form); the
 * operations layer normalizes them into allowlisted local-file:// FileData.
 */
import { z } from 'zod'

export const mediaSchema = z.union([
  z.string().min(1),
  z
    .object({
      path: z.string().min(1).optional(),
      url: z.string().min(1).optional(),
      name: z.string().optional()
    })
    .refine((value) => Boolean(value.path || value.url), {
      message: 'Media entry must include "path" or "url"'
    })
])

const dynamicDataSchema = z.object({
  title: z.string().optional(),
  content: z.string().min(1),
  images: z.array(mediaSchema).optional(),
  videos: z.array(mediaSchema).optional(),
  tags: z.array(z.string()).optional()
})

const videoDataSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
  video: mediaSchema,
  cover: mediaSchema.optional(),
  tags: z.array(z.string()).optional()
})

const articleDataSchema = z
  .object({
    title: z.string().min(1),
    digest: z.string().optional(),
    cover: mediaSchema.optional(),
    htmlContent: z.string().optional(),
    markdownContent: z.string().optional(),
    images: z.array(mediaSchema).optional(),
    tags: z.array(z.string()).optional()
  })
  .refine((value) => Boolean(value.htmlContent || value.markdownContent), {
    message: 'Article requires "htmlContent" or "markdownContent"'
  })

const podcastDataSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  audio: mediaSchema,
  cover: mediaSchema.optional(),
  tags: z.array(z.string()).optional()
})

export const createPublishSchema = z.discriminatedUnion('contentType', [
  z.object({
    contentType: z.literal('DYNAMIC'),
    accountIds: z.array(z.string().min(1)).min(1),
    autoSubmit: z.boolean().optional(),
    data: dynamicDataSchema
  }),
  z.object({
    contentType: z.literal('VIDEO'),
    accountIds: z.array(z.string().min(1)).min(1),
    autoSubmit: z.boolean().optional(),
    data: videoDataSchema
  }),
  z.object({
    contentType: z.literal('ARTICLE'),
    accountIds: z.array(z.string().min(1)).min(1),
    autoSubmit: z.boolean().optional(),
    data: articleDataSchema
  }),
  z.object({
    contentType: z.literal('PODCAST'),
    accountIds: z.array(z.string().min(1)).min(1),
    autoSubmit: z.boolean().optional(),
    data: podcastDataSchema
  })
])

export const execSchema = z.object({
  viewId: z.string().min(1),
  script: z.string().min(1)
})

export const execGroupSchema = z.object({
  groupId: z.string().min(1),
  accountId: z.string().min(1),
  script: z.string().min(1)
})

export const devtoolsSchema = z.object({
  groupId: z.string().min(1),
  accountId: z.string().min(1)
})
