declare module 'virtual:injector-bundles' {
  export const injectorGlobalName: string
  export const injectorBundles: Record<string, string>
  export interface InjectorBundleMeta {
    sha256: string
    schemaVersion: number
  }
  // Per-key content hash + schema version for the built-in bundles; the registry
  // uses sha256 to decide whether a remote (hot-updated) bundle actually differs.
  export const injectorBundleMeta: Record<string, InjectorBundleMeta>
  export default injectorBundles
}

// Desktop must not import extension runtime modules directly. The esbuild bundle guard rejects
// value imports from @ext/sync/common, ~sync/common, and parent platform InfoMap modules; use
// type-only imports in extension injectors so common.ts is erased before bundling.
