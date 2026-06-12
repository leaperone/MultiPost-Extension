export const SITE_URL = 'https://multipost.app';

export const DEFAULT_TITLE =
  'MultiPost - 开源社交媒体一键分发工具 | 多平台内容发布神器';
export const TITLE_TEMPLATE = '%s | MultiPost';
export const DEFAULT_DESCRIPTION =
  '🚀 MultiPost 是一款开源浏览器插件,支持一键将内容分发到微博、小红书、Twitter、LinkedIn 等多个社交平台。提供智能内容提取、AI 辅助创作、平台优化等功能,让内容创作者轻松管理多平台账号。';

export const ROOT_KEYWORDS = [
  '社交媒体管理工具',
  '多平台发布',
  '内容分发',
  '一键发布',
  '开源工具',
  'MultiPost',
  '微博发布工具',
  '小红书发布',
  'Twitter 发布',
  '浏览器插件',
  'social media management',
  'multi-platform publishing',
  'content distribution',
];

export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'MultiPost',
  url: SITE_URL,
  logo: `${SITE_URL}/og-image.png`,
  sameAs: [
    'https://github.com/leaperone',
    'https://x.com/harry_is_fish',
    'https://discord.gg/GNsCX9zFwQ',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'support@leaper.one',
    contactType: 'customer service',
  },
};

export const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'MultiPost',
  url: SITE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE_URL}/docs?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
};

export function pageTitle(title?: string) {
  return title ? TITLE_TEMPLATE.replace('%s', title) : DEFAULT_TITLE;
}

export function routeMeta({
  title,
  description,
  robots,
}: {
  title?: string;
  description?: string;
  robots?: string;
}) {
  return [
    { title: pageTitle(title) },
    ...(description ? [{ name: 'description', content: description }] : []),
    ...(robots ? [{ name: 'robots', content: robots }] : []),
  ];
}
