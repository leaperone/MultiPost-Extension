import { blogI18n } from '@/lib/blog-i18n';
import { blog } from '@/.source';
import { loader } from 'fumadocs-core/source';

export const blogSource = loader({
  i18n: blogI18n,
  baseUrl: '/blog',
  source: blog.toFumadocsSource(),
  // Custom URL function: /blog/{lang}/{slug} instead of default /{lang}/blog/{slug}
  url: (slugs, locale) => {
    const lang = locale ?? blogI18n.defaultLanguage;
    const slugPath = slugs.length > 0 ? `/${slugs.join('/')}` : '';
    return `/blog/${lang}${slugPath}`;
  },
});
