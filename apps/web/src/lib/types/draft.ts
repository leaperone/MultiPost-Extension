import { z } from 'zod';

export const DraftFileSourceSchema = z.enum(['local', 'mp_oss', 'remote_url', 'generated']);
export type DraftFileSource = z.infer<typeof DraftFileSourceSchema>;

export const DraftFileDataSchema = z.object({
  rid: z.string().optional(),
  source: DraftFileSourceSchema,
  name: z.string(),
  url: z.string().url(),
  type: z.string(),
  size: z.number(),
});
export type DraftFileData = z.infer<typeof DraftFileDataSchema>;

export const DraftFileDataClientSchema = DraftFileDataSchema.extend({
  uploadProgress: z.number().optional(),
  file: z.any().optional(),
});
export type DraftFileDataClient = z.infer<typeof DraftFileDataClientSchema>;

export const DraftFilesSchema = z.array(DraftFileDataSchema);
export type DraftFiles = z.infer<typeof DraftFilesSchema>;

export const DraftSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  content: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  files: z.array(DraftFileDataSchema).optional(),
});
export type Draft = z.infer<typeof DraftSchema>;

export const FileHostingSchema = z.object({
  id: z.string(),
  userId: z.string(),
  key: z.string(),
  type: z.string().nullable(),
  size: z.number(),
  times: z.number(),
  filename: z.string().nullable(),
  previewUrl: z.string().nullable(),
  expiredAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type FileHosting = z.infer<typeof FileHostingSchema>;
