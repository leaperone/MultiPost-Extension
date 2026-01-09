import { docsI18n } from '@/lib/docs-i18n';
import { docs } from '@/.source';
import { loader } from 'fumadocs-core/source';

export const docsSource = loader({
  i18n: docsI18n,
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
  // Custom URL function: /docs/{lang}/{slug} instead of default /{lang}/docs/{slug}
  url: (slugs, locale) => {
    const lang = locale ?? docsI18n.defaultLanguage;
    const slugPath = slugs.length > 0 ? `/${slugs.join('/')}` : '';
    return `/docs/${lang}${slugPath}`;
  },
});
