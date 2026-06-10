interface LocaleJsonModule {
  default: Record<string, unknown>;
}

export type LocaleResources = Record<string, Record<string, unknown>>;

export function buildNamespaces(modules: Record<string, LocaleJsonModule>): LocaleResources {
  return Object.entries(modules).reduce<LocaleResources>((acc, [path, mod]) => {
    const match = path.match(/locales\/[^/]+\/([^/]+)\.json$/);
    if (!match) return acc;

    acc[match[1]] = mod.default;
    return acc;
  }, {});
}
