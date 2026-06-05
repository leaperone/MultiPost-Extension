declare module 'virtual:injector-bundles' {
  export const injectorGlobalName: string
  export const injectorBundles: Record<string, string>
  export default injectorBundles
}

// Desktop must not import extension runtime modules directly. The esbuild bundle guard rejects
// value imports from @ext/sync/common, ~sync/common, and parent platform InfoMap modules; use
// type-only imports in extension injectors so common.ts is erased before bundling.
