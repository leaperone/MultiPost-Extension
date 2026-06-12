// Path-comment normalization shared across desktop build, web build, and the
// Electron main process (download verification). Kept dependency-free (no
// esbuild / Node-only APIs) so importing it into the main process never pulls
// the heavy build toolchain into the runtime bundle.
//
// esbuild prefixes each bundled module with a `// <path>` comment relative to
// absWorkingDir. That prefix differs between the desktop and web builds while
// the code is identical, so content addressing hashes the path-normalized
// bundle: same source -> same sha on both sides.
export function normalizeBundle(iife) {
  return iife.replace(/^(\s*\/\/ )[^\n]*\/([^/\n]+\.(?:ts|tsx|js|jsx|mjs|json))$/gm, '$1$2')
}
