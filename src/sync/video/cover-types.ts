// Type-only contracts: injected functions must not capture runtime imports.
export interface CoverImageSource {
  url: string;
  width?: number;
  height?: number;
}
export interface CoverMaterial {
  file: File;
  sha256: string;
}
export interface SavedImagePreview {
  previewUrl: string;
  previousPreviewUrl?: string;
  width: number;
  height: number;
}
export interface SavedCoverPreview extends SavedImagePreview {
  ratio: string;
  saved: true;
}
export interface CroppedCoverPreview {
  previewKind: "cropped_image";
  previewSha256: string;
  width: number;
  height: number;
}
export interface SavedCoverSlot {
  ratio: string;
  sha256: string;
  width: number;
  height: number;
  saved: boolean;
  previewUrl?: string;
  previousPreviewUrl?: string;
  previewKind?: "cropped_image";
  previewSha256?: string;
  inputPreviewSha256?: string;
  previousPreviewSha256?: string;
  slotLabel?: string;
}
export interface CoverUploadResult {
  version: 1;
  status: "saved" | "failed" | "needs_attention" | "skipped";
  mutationStarted: boolean;
  slots: SavedCoverSlot[];
  stages: { stage: string; ratio?: string; at: string }[];
  error?: string;
  editorLifecycle?: Record<string, boolean>;
}
export interface FileVideoIdentity {
  videoReady: true;
  kind: "file";
  file: File;
  name: string;
  size: number;
  type: string;
}
export interface PlayerVideoIdentity {
  videoReady: true;
  kind: "player";
  src: string;
  duration: number;
}
export interface MissingVideoIdentity {
  videoReady: false;
}
export type ReadyVideoIdentity = FileVideoIdentity | PlayerVideoIdentity;
export type VideoIdentity = ReadyVideoIdentity | MissingVideoIdentity;
