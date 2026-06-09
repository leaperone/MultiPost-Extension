type LocaleJsonModule = {
  default: Record<string, unknown>;
};

const modules = import.meta.glob<LocaleJsonModule>(
  '../../i18n/locales/*/*.json',
  { eager: true },
);

export const resources = Object.entries(modules).reduce<
  Record<string, Record<string, Record<string, unknown>>>
>((acc, [path, mod]) => {
  const match = path.match(/locales\/([^/]+)\/([^/]+)\.json$/);
  if (!match) return acc;

  const [, lang, namespace] = match;
  acc[lang] ??= {};
  acc[lang][namespace] = mod.default;
  return acc;
}, {});
