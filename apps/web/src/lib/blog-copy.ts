export const blogTexts = {
  en: {
    title: 'MultiPost Blog',
    subtitle: 'Tips, tutorials, and insights for content creators',
    description:
      'Learn how to maximize your social media reach with multi-platform publishing strategies, tool comparisons, and creator success stories.',
    noBlogsMessage: 'New articles coming soon. Stay tuned!',
    readMore: 'Read article',
    untitled: 'Untitled',
  },
  'zh-Hans': {
    title: 'MultiPost 博客',
    subtitle: '内容创作者的效率指南',
    description: '多平台发布技巧、工具对比评测、创作者成长策略，助你提升内容影响力。',
    noBlogsMessage: '精彩内容即将上线，敬请期待！',
    readMore: '阅读全文',
    untitled: '无标题',
  },
  'zh-Hant': {
    title: 'MultiPost 部落格',
    subtitle: '內容創作者的效率指南',
    description: '多平台發布技巧、工具對比評測、創作者成長策略，助你提升內容影響力。',
    noBlogsMessage: '精彩內容即將上線，敬請期待！',
    readMore: '閱讀全文',
    untitled: '無標題',
  },
  ja: {
    title: 'MultiPost ブログ',
    subtitle: 'コンテンツクリエイターのための効率ガイド',
    description:
      'マルチプラットフォーム配信のコツ、ツール比較、クリエイター成功事例をお届けします。',
    noBlogsMessage: '新しい記事を準備中です。お楽しみに！',
    readMore: '続きを読む',
    untitled: 'Untitled',
  },
  fr: {
    title: 'Blog MultiPost',
    subtitle: "Guide d'efficacité pour les créateurs de contenu",
    description:
      "Conseils de publication multiplateforme, comparaisons d'outils et stratégies de croissance pour les créateurs.",
    noBlogsMessage: 'De nouveaux articles arrivent bientôt. Restez connecté !',
    readMore: "Lire l'article",
    untitled: 'Untitled',
  },
  es: {
    title: 'Blog de MultiPost',
    subtitle: 'Guía de eficiencia para creadores de contenido',
    description:
      'Consejos de publicación multiplataforma, comparaciones de herramientas y estrategias de crecimiento para creadores.',
    noBlogsMessage: '¡Nuevos artículos próximamente. Mantente atento!',
    readMore: 'Leer artículo',
    untitled: 'Untitled',
  },
  pt: {
    title: 'Blog MultiPost',
    subtitle: 'Guia de eficiência para criadores de conteúdo',
    description:
      'Dicas de publicação multiplataforma, comparações de ferramentas e estratégias de crescimento para criadores.',
    noBlogsMessage: 'Novos artigos em breve. Fique ligado!',
    readMore: 'Ler artigo',
    untitled: 'Untitled',
  },
  ko: {
    title: 'MultiPost 블로그',
    subtitle: '콘텐츠 크리에이터를 위한 효율 가이드',
    description: '멀티플랫폼 게시 팁, 도구 비교, 크리에이터 성장 전략을 제공합니다.',
    noBlogsMessage: '새로운 글이 곧 올라옵니다. 기대해 주세요!',
    readMore: '더 읽기',
    untitled: 'Untitled',
  },
  ms: {
    title: 'Blog MultiPost',
    subtitle: 'Panduan kecekapan untuk pencipta kandungan',
    description:
      'Tips penerbitan berbilang platform, perbandingan alat, dan strategi pertumbuhan untuk pencipta.',
    noBlogsMessage: 'Artikel baharu akan datang tidak lama lagi. Nantikan!',
    readMore: 'Baca artikel',
    untitled: 'Untitled',
  },
  id: {
    title: 'Blog MultiPost',
    subtitle: 'Panduan efisiensi untuk kreator konten',
    description:
      'Tips publikasi multi-platform, perbandingan alat, dan strategi pertumbuhan untuk kreator.',
    noBlogsMessage: 'Artikel baru segera hadir. Nantikan!',
    readMore: 'Baca artikel',
    untitled: 'Untitled',
  },
  ru: {
    title: 'Блог MultiPost',
    subtitle: 'Руководство по эффективности для создателей контента',
    description:
      'Советы по мультиплатформенной публикации, сравнения инструментов и стратегии роста для создателей.',
    noBlogsMessage: 'Новые статьи скоро появятся. Следите за обновлениями!',
    readMore: 'Читать статью',
    untitled: 'Untitled',
  },
} as const;

export const blogLanguages = [
  { code: 'en', label: 'English' },
  { code: 'zh-Hans', label: '简体中文' },
  { code: 'zh-Hant', label: '繁體中文' },
  { code: 'ja', label: '日本語' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'pt', label: 'Português' },
  { code: 'ko', label: '한국어' },
  { code: 'ms', label: 'Melayu' },
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'ru', label: 'Русский' },
] as const;

export function getBlogText(lang: string) {
  return blogTexts[lang as keyof typeof blogTexts] ?? blogTexts.en;
}
