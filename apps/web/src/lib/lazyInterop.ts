/**
 * Vite's dev server prebundles CJS dependencies (react-player, react-viewer),
 * so `import('react-player')` resolves to `{ default: Component }`. The
 * production Rollup build instead exposes the raw CommonJS exports object,
 * making the namespace `{ default: { __esModule: true, default: Component } }`.
 * React.lazy then receives an object as the element type and crashes with
 * React error #306. Unwrap the extra layer so both builds behave the same.
 */
export function interopDefault<M extends { default: unknown }>(mod: M): { default: M['default'] } {
  let resolved: unknown = mod.default ?? mod;
  if (
    resolved &&
    typeof resolved === 'object' &&
    (resolved as { __esModule?: boolean }).__esModule &&
    (resolved as { default?: unknown }).default
  ) {
    resolved = (resolved as { default: unknown }).default;
  }
  return { default: resolved as M['default'] };
}
