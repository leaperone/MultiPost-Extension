import type { LocaleResources } from './bundles/build';
import type { Locales } from './settings';

// Each locale lives in its own async chunk so the client only downloads the
// active language (plus the fallback) instead of shipping every locale inside
// the entry bundle. Add a bundle file under ./bundles when adding a locale.
const bundleLoaders: Record<Locales, () => Promise<{ default: LocaleResources }>> = {
  en: () => import('./bundles/en'),
  'zh-CN': () => import('./bundles/zh-CN'),
};

const cache = new Map<Locales, Promise<LocaleResources>>();

export function loadLocaleResources(locale: Locales): Promise<LocaleResources> {
  let pending = cache.get(locale);
  if (!pending) {
    pending = bundleLoaders[locale]().then((mod) => mod.default);
    // Drop failed loads so a later call can retry instead of caching the error.
    pending.catch(() => {
      if (cache.get(locale) === pending) cache.delete(locale);
    });
    cache.set(locale, pending);
  }
  return pending;
}
