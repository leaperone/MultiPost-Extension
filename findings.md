# 博客迁移 - 研究发现

## 源项目分析

### 项目结构
```
/root/MultiPost-Blog/
├── app/
│   ├── [lang]/
│   │   ├── blog/       # 博客路由
│   │   └── api/        # API 路由
│   ├── layout.tsx      # 根布局
│   └── sitemap.ts
├── content/
│   └── docs/           # MDX 内容
│       ├── introducing-multipost/
│       ├── platforms-introduce/
│       ├── multipost-vs-buffer/
│       ├── multipost-vs-hootsuite/
│       ├── multipost-vs-xinbang/
│       ├── multipost-vs-yixiaoer/
│       ├── saas-boosts-social-media-efficiency-podcast/
│       └── solo-creator-multi-platform-strategy/
└── source.config.ts    # Fumadocs 配置
```

### MDX 文件格式
- **Frontmatter 字段**:
  - `title`: 文章标题
  - `description`: 描述
  - `keywords`: SEO 关键词
  - `date`: 发布日期 (YYYY-MM-DD)
  - `author`: 作者

- **语言支持** (11 种):
  - `index.mdx` - 英文 (默认)
  - `index.zh-Hans.mdx` - 简体中文
  - `index.zh-Hant.mdx` - 繁体中文
  - `index.ja.mdx` - 日语
  - `index.ko.mdx` - 韩语
  - `index.es.mdx` - 西班牙语
  - `index.pt.mdx` - 葡萄牙语
  - `index.fr.mdx` - 法语
  - `index.ru.mdx` - 俄语
  - `index.id.mdx` - 印尼语
  - `index.ms.mdx` - 马来语

### 使用的 MDX 组件
- `<Cards>` - 卡片容器
- `<Card>` - 单个卡片 (带 title 和 href 属性)

### 依赖版本
```json
{
  "fumadocs-core": "15.5.4",
  "fumadocs-mdx": "11.6.9",
  "fumadocs-ui": "15.5.4",
  "next": "15.3.6"
}
```

---

## 目标项目分析

### 现有 i18n 支持
- 使用 `i18next` + `react-i18next`
- 已有语言检测: `i18next-browser-languagedetector`
- 语言资源加载: `i18next-resources-to-backend`

### 现有路由结构
```
app/
├── (default)/     # 首页等
├── dashboard/     # 用户面板
├── admin/         # 管理后台
├── api/           # API 路由
└── ... (无 blog)
```

### UI 组件库
- HeroUI (主要)
- Radix UI (辅助)
- Tailwind CSS (样式)
- Lucide React (图标)

---

## 技术决策

### 选择 `next-mdx-remote` 的理由

1. **灵活性**: 可在运行时加载 MDX
2. **组件映射**: 易于自定义组件 (替换 Fumadocs 的 Cards/Card)
3. **社区支持**: 广泛使用，文档完善
4. **兼容性**: 与 Next.js 15 App Router 良好配合

### 需要处理的兼容问题

1. **组件替换**:
   - `<Cards>` → 自定义卡片网格组件
   - `<Card>` → HeroUI Card 或自定义卡片

2. **样式适配**:
   - MDX 内容需要使用 `@tailwindcss/typography` 的 prose 类
   - 代码高亮需要处理

3. **链接处理**:
   - 外部链接添加 `target="_blank"`
   - 内部链接使用 Next.js Link

---

## 参考资源

- [next-mdx-remote 文档](https://github.com/hashicorp/next-mdx-remote)
- [Next.js MDX 官方文档](https://nextjs.org/docs/app/building-your-application/configuring/mdx)
- [@tailwindcss/typography](https://tailwindcss.com/docs/typography-plugin)
