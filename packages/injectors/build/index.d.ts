// Type declarations for the Node-only injector build helper (build/index.mjs).
export const INJECTOR_BUNDLES_VIRTUAL_ID: string;
export const INJECTOR_BUNDLES_RESOLVED_ID: string;
export const INJECTOR_CONTENT_HELPER_VIRTUAL_ID: string;
export const INJECTOR_CONTENT_HELPER_RESOLVED_ID: string;
export const DEFAULT_INJECTOR_GLOBAL_NAME: string;
export const INJECTOR_SCHEMA_VERSION: number;

export function sha256Hex(text: string): string;
export function normalizeBundle(iife: string): string;

export interface InjectorBuilderConfig {
  sourceRoot: string;
  syncRoot: string;
  contentsRoot: string;
  entriesPath: string;
  contentHelperEntry: string;
  tsconfigPath: string;
  absWorkingDir: string;
  globalName?: string;
  forbiddenSyncValueFiles?: string[];
  injectorSourcefilePrefix?: string;
  contentHelperSourcefile?: string;
}

export interface InjectorBundleEntry {
  extensionKey: string;
  source: string;
  exportName: string;
  [key: string]: unknown;
}

export interface InjectorBundleResult {
  bundles: Record<string, string>;
  entries: InjectorBundleEntry[];
  watchFiles: string[];
}

export interface ContentHelperResult {
  iife: string;
  watchFiles: string[];
}

export interface InjectorBundleMetaEntry {
  sha256: string;
  schemaVersion: number;
}

export interface VitePluginLike {
  name: string;
  enforce?: 'pre' | 'post';
  resolveId(id: string): string | null;
  load(id: string): Promise<string | null>;
}

export interface InjectorBuilder {
  loadEntries(): Promise<InjectorBundleEntry[]>;
  getEntryAbsolutePath(entry: InjectorBundleEntry): string;
  buildBundleResult(options?: { log?: boolean }): Promise<InjectorBundleResult>;
  buildContentHelperResult(options?: { log?: boolean }): Promise<ContentHelperResult>;
  buildBundleMeta(bundles: Record<string, string>): Record<string, InjectorBundleMetaEntry>;
  createBundlesModuleCode(bundles: Record<string, string>): string;
  createContentHelperModuleCode(contentHelperBundle: string): string;
  bundlesVirtualModulePlugin(): VitePluginLike;
  contentHelperVirtualModulePlugin(): VitePluginLike;
}

export function createInjectorBuilder(config: InjectorBuilderConfig): InjectorBuilder;
