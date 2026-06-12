import { z } from 'zod'

/** Path the desktop fetches the hot-update manifest from, relative to the web origin. */
export const INJECTOR_MANIFEST_PATH = '/injectors/manifest.json'

export const RemoteInjectorEntrySchema = z.object({
  extensionKey: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  schemaVersion: z.number().int().positive(),
  url: z.string().min(1),
  minDesktopVersion: z.string().optional()
})

export const RemoteInjectorManifestSchema = z.object({
  schemaVersion: z.number().int(),
  generatedBy: z.string().optional(),
  entries: z.array(RemoteInjectorEntrySchema),
  // Reserved: an offline ed25519 signature over the manifest. Not enforced in
  // this phase (trust = own web infra + HTTPS), but kept so adding it later is
  // a non-breaking change.
  signature: z.string().optional()
})

export type RemoteInjectorEntry = z.infer<typeof RemoteInjectorEntrySchema>
export type RemoteInjectorManifest = z.infer<typeof RemoteInjectorManifestSchema>
